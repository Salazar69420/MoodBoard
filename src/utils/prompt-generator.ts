import type { CategoryNote, ShotCategoryId } from '../types';
import { SHOT_CATEGORIES } from '../types';
import { getBlob } from './db-operations';

const SYSTEM_PROMPT = `You are a precise writing assistant for AI filmmakers. Your ONLY job is to take the user's raw shot notes and the reference images, then combine them into a clean, well-structured English prompt.

STRICT RULES:
1. ONLY use information from the notes and what is literally visible in the reference image(s). Do NOT invent, assume, or add ANY details beyond what is provided. If multiple images are provided, the first is the primary reference, and the others are supplementary references (e.g., character sheets, style proofs, etc.). Synthesize them accordingly.
2. Preserve the filmmaker's creative intent exactly — you are a writing tool, not a creative director.
3. Fix grammar, spelling, and sentence structure to make the notes read naturally.
4. Organize the prompt in a logical flow: subject → action → environment → camera → lighting → color → texture → lens → mood → audio.
5. Only include categories that have notes — skip empty ones entirely.
6. Keep the tone concise and technical, like professional film direction notes.
7. Do NOT add introductory phrases like "Here is your prompt" or "Based on your notes". Just output the prompt directly.
8. Do NOT add markdown formatting, bullet points, or headers. Output a flowing paragraph or short paragraphs.
9. If the images show something relevant that helps contextualize the notes, incorporate it naturally, but never add details the filmmaker didn't note.`;

function buildUserMessage(notes: CategoryNote[]): string {
    const grouped = new Map<ShotCategoryId, CategoryNote[]>();
    for (const note of notes) {
        const existing = grouped.get(note.categoryId) || [];
        existing.push(note);
        grouped.set(note.categoryId, existing);
    }

    let message = 'Here are my shot notes. Please combine them into a clean prompt:\n\n';

    for (const cat of SHOT_CATEGORIES) {
        const catNotes = grouped.get(cat.id);
        if (!catNotes || catNotes.length === 0) continue;

        const texts = catNotes
            .map(n => n.text.trim())
            .filter(t => t.length > 0);

        const checkedPrompts = catNotes.flatMap(n =>
            n.checkedPrompts.filter(p => !texts.some(t => t.toLowerCase().includes(p.toLowerCase())))
        );

        if (texts.length === 0 && checkedPrompts.length === 0) continue;

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
                // Remove data URL prefix to get pure base64
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

export interface PromptResult {
    prompt: string;
    model: string;
    timestamp: number;
}

export async function generatePrompt(
    apiKey: string,
    model: string,
    blobId: string,
    mimeType: string,
    notes: CategoryNote[],
    connectedImages: import('../types').BoardImage[] = [],
): Promise<PromptResult> {
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
            'X-Title': 'Moodboard App - Shot Prompt Generator',
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
