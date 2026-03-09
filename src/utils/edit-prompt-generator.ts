import type { EditNote, EditCategoryId } from '../types';
import { EDIT_CATEGORIES } from '../types';
import { getBlob } from './db-operations';

const SYSTEM_PROMPT = `You are a precise writing assistant for AI image editors and visual artists. Your ONLY job is to take the user's raw image edit notes (organized into KEEP and CUT zones) and the reference image(s), then combine them into a clean, well-structured English prompt suitable for AI image editing tools.

STRICT RULES:
1. ONLY use information from the notes and what is literally visible in the reference image(s). Do NOT invent, assume, or add ANY details beyond what is provided. If multiple images are provided, the first is the primary reference to edit, and the others are supplementary references (e.g., character sheets, style proofs, etc.). Synthesize them accordingly.
2. Preserve the artist's creative intent exactly — you are a writing tool, not a creative director.
3. Fix grammar, spelling, and sentence structure to make the notes read naturally.
4. Organize the prompt in two clear sections: first describe what must be PRESERVED (KEEP zone), then describe what must CHANGE (CUT zone).
5. Only include categories that have notes — skip empty ones entirely.
6. Keep the tone concise and technical, like professional retouching direction notes.
7. Do NOT add introductory phrases like "Here is your prompt" or "Based on your notes". Just output the prompt directly.
8. Do NOT add markdown formatting, bullet points, or headers. Output flowing paragraphs.
9. If the images show something relevant that helps contextualize the notes, incorporate it naturally, but never add details the artist didn't note.
10. Be explicit about the transformation: clearly state what the FROM and TO states are for each change.`;

function buildUserMessage(notes: EditNote[]): string {
    const grouped = new Map<EditCategoryId, EditNote[]>();
    for (const note of notes) {
        const existing = grouped.get(note.categoryId) || [];
        existing.push(note);
        grouped.set(note.categoryId, existing);
    }

    let message = 'Here are my image edit notes. Please combine them into a clean edit prompt:\n\n';

    // KEEP zone first
    const keepCats = EDIT_CATEGORIES.filter(c => c.zone === 'keep');
    const cutCats = EDIT_CATEGORIES.filter(c => c.zone === 'cut');

    let hasKeep = false;
    for (const cat of keepCats) {
        const catNotes = grouped.get(cat.id);
        if (!catNotes || catNotes.length === 0) continue;

        const texts = catNotes
            .map(n => n.text.trim())
            .filter(t => t.length > 0);

        const checkedPrompts = catNotes.flatMap(n =>
            n.checkedPrompts.filter(p => !texts.some(t => t.toLowerCase().includes(p.toLowerCase())))
        );

        if (texts.length === 0 && checkedPrompts.length === 0) continue;

        if (!hasKeep) {
            message += '=== KEEP (Preserve these elements) ===\n';
            hasKeep = true;
        }

        message += `[${cat.label}]\n`;
        if (texts.length > 0) message += texts.join('\n') + '\n';
        if (checkedPrompts.length > 0) {
            message += `Checked items: ${checkedPrompts.join(', ')}\n`;
        }
        message += '\n';
    }

    let hasCut = false;
    for (const cat of cutCats) {
        const catNotes = grouped.get(cat.id);
        if (!catNotes || catNotes.length === 0) continue;

        const texts = catNotes
            .map(n => n.text.trim())
            .filter(t => t.length > 0);

        const checkedPrompts = catNotes.flatMap(n =>
            n.checkedPrompts.filter(p => !texts.some(t => t.toLowerCase().includes(p.toLowerCase())))
        );

        if (texts.length === 0 && checkedPrompts.length === 0) continue;

        if (!hasCut) {
            message += '=== CUT (Change these elements) ===\n';
            hasCut = true;
        }

        message += `[${cat.label}]\n`;
        if (texts.length > 0) message += texts.join('\n') + '\n';
        if (checkedPrompts.length > 0) {
            message += `Checked items: ${checkedPrompts.join(', ')}\n`;
        }
        message += '\n';
    }

    return message;
}

async function imageToBase64(blobId: string): Promise<string | null> {
    try {
        const blob = await getBlob(blobId);
        if (!blob) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export interface EditPromptResult {
    prompt: string;
    model: string;
    timestamp: number;
}

export async function generateEditPrompt(
    apiKey: string,
    model: string,
    blobId: string,
    mimeType: string,
    notes: EditNote[],
    connectedImages: import('../types').BoardImage[] = [],
): Promise<EditPromptResult> {
    const userMessage = buildUserMessage(notes);
    const primaryImageBase64 = await imageToBase64(blobId);

    const connectedBase64s = await Promise.all(
        connectedImages.map(async (img) => {
            const b64 = await imageToBase64(img.blobId);
            return b64 ? { b64, mime: img.mimeType, label: img.label } : null;
        })
    );
    const validConnected = connectedBase64s.filter(c => c !== null) as { b64: string; mime: string; label?: string }[];

    const messages: Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }> = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

    if (primaryImageBase64) {
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            {
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${primaryImageBase64}`,
                },
            },
        ];

        for (const conn of validConnected) {
            if (conn.label) {
                contentParts.push({
                    type: 'text',
                    text: `Supplementary reference image for @${conn.label.replace(/\s+/g, '_')}:`,
                });
            }
            contentParts.push({
                type: 'image_url',
                image_url: {
                    url: `data:${conn.mime || 'image/jpeg'};base64,${conn.b64}`,
                },
            });
        }

        contentParts.push({
            type: 'text',
            text: userMessage,
        });

        messages.push({
            role: 'user',
            content: contentParts,
        });
    } else {
        messages.push({ role: 'user', content: userMessage });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Moodboard App - Image Edit Prompt Generator',
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim() || '';

    if (!prompt) {
        throw new Error('Empty response from model');
    }

    return {
        prompt,
        model,
        timestamp: Date.now(),
    };
}
