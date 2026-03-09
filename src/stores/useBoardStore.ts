import { create } from 'zustand';
import type { Connection, TextNode, CategoryNote, ShotCategoryId, EditNote, EditCategoryId, PromptNode } from '../types';
import { getDB } from '../utils/db';
import { nanoid } from 'nanoid';

interface BoardStore {
    connections: Connection[];
    textNodes: TextNode[];
    categoryNotes: CategoryNote[];
    editNotes: EditNote[];
    connectingFromId: string | null;
    boardMode: 'i2v' | 'edit';

    setBoardMode: (mode: 'i2v' | 'edit') => void;
    loadBoard: (projectId: string) => Promise<void>;

    startConnection: (fromId: string) => void;
    finishConnection: (projectId: string, toId: string) => Promise<void>;
    cancelConnection: () => void;
    removeConnection: (id: string) => Promise<void>;
    updateConnectionLabel: (id: string, label: string) => Promise<void>;

    addTextNode: (projectId: string, x: number, y: number) => Promise<string>;
    updateTextNode: (id: string, updates: Partial<TextNode>) => Promise<void>;
    removeTextNode: (id: string) => Promise<void>;

    addCategoryNote: (
        projectId: string,
        imageId: string,
        categoryId: ShotCategoryId,
        x: number,
        y: number
    ) => Promise<string>;
    updateCategoryNote: (id: string, updates: Partial<CategoryNote>) => Promise<void>;
    removeCategoryNote: (id: string) => Promise<void>;
    removeCategoryNotesForImage: (imageId: string) => Promise<void>;

    // ── Edit Notes ──
    addEditNote: (
        projectId: string,
        imageId: string,
        categoryId: EditCategoryId,
        x: number,
        y: number
    ) => Promise<string>;
    updateEditNote: (id: string, updates: Partial<EditNote>) => Promise<void>;
    removeEditNote: (id: string) => Promise<void>;
    removeEditNotesForImage: (imageId: string) => Promise<void>;

    // ── Prompt Nodes ──
    promptNodes: PromptNode[];
    addPromptNode: (
        projectId: string,
        imageId: string,
        text: string,
        model: string,
        promptType: 'i2v' | 'edit',
        x: number,
        y: number,
    ) => Promise<string>;
    updatePromptNode: (id: string, updates: Partial<PromptNode>) => Promise<void>;
    removePromptNode: (id: string) => Promise<void>;

    // ── Auto-arrange ──
    autoArrangeNotes: (images: import('../types').BoardImage[]) => Promise<void>;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
    connections: [],
    textNodes: [],
    categoryNotes: [],
    editNotes: [],
    promptNodes: [],
    connectingFromId: null,
    boardMode: 'i2v',

    setBoardMode: (mode) => set({ boardMode: mode }),

    loadBoard: async (projectId) => {
        const db = await getDB();
        const connections = await db.getAllFromIndex('connections', 'by-project', projectId);
        const textNodes = await db.getAllFromIndex('textNodes', 'by-project', projectId);
        const categoryNotes = await db.getAllFromIndex('categoryNotes', 'by-project', projectId);
        const editNotes = await db.getAllFromIndex('editNotes', 'by-project', projectId);
        const promptNodes = await db.getAllFromIndex('promptNodes', 'by-project', projectId);
        set({ connections, textNodes, categoryNotes, editNotes, promptNodes, connectingFromId: null });
    },

    startConnection: (fromId) => set({ connectingFromId: fromId }),

    finishConnection: async (projectId, toId) => {
        const fromId = get().connectingFromId;
        if (!fromId || fromId === toId) {
            set({ connectingFromId: null });
            return;
        }

        const exists = get().connections.some(c =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );

        if (!exists) {
            const db = await getDB();
            const newConn: Connection = {
                id: nanoid(),
                projectId,
                fromId,
                toId,
                label: ''
            };
            await db.put('connections', newConn);
            set(state => ({
                connections: [...state.connections, newConn],
                connectingFromId: null
            }));
        } else {
            set({ connectingFromId: null });
        }
    },

    cancelConnection: () => set({ connectingFromId: null }),

    removeConnection: async (id) => {
        const db = await getDB();
        await db.delete('connections', id);
        set(state => ({
            connections: state.connections.filter(c => c.id !== id)
        }));
    },

    updateConnectionLabel: async (id, label) => {
        const db = await getDB();
        const conn = await db.get('connections', id);
        if (conn) {
            conn.label = label;
            await db.put('connections', conn);
            set(state => ({
                connections: state.connections.map(c => c.id === id ? { ...c, label } : c)
            }));
        }
    },

    addTextNode: async (projectId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNode: TextNode = {
            id,
            projectId,
            text: '',
            x,
            y,
            width: 200,
            height: 100,
            color: '#ffffff',
            fontSize: 14
        };
        await db.put('textNodes', newNode);
        set(state => ({
            textNodes: [...state.textNodes, newNode]
        }));
        return id;
    },

    updateTextNode: async (id, updates) => {
        const db = await getDB();
        const node = await db.get('textNodes', id);
        if (node) {
            const updatedNode = { ...node, ...updates };
            await db.put('textNodes', updatedNode);
            set(state => ({
                textNodes: state.textNodes.map(n => n.id === id ? updatedNode : n)
            }));
        }
    },

    removeTextNode: async (id) => {
        const db = await getDB();
        await db.delete('textNodes', id);
        set(state => ({
            textNodes: state.textNodes.filter(n => n.id !== id)
        }));
    },

    // ─── Category Notes ──────────────────────────────────────────────────────

    addCategoryNote: async (projectId, imageId, categoryId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNote: CategoryNote = {
            id,
            projectId,
            imageId,
            categoryId,
            text: '',
            x,
            y,
            width: 240,
            height: 160,
            checkedPrompts: [],
            isMinimized: false,
        };
        await db.put('categoryNotes', newNote);
        set(state => ({ categoryNotes: [...state.categoryNotes, newNote] }));
        return id;
    },

    updateCategoryNote: async (id, updates) => {
        const db = await getDB();
        const note = await db.get('categoryNotes', id);
        if (note) {
            const updated = { ...note, ...updates };
            await db.put('categoryNotes', updated);
            set(state => ({
                categoryNotes: state.categoryNotes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removeCategoryNote: async (id) => {
        const db = await getDB();
        await db.delete('categoryNotes', id);
        set(state => ({
            categoryNotes: state.categoryNotes.filter(n => n.id !== id)
        }));
    },

    removeCategoryNotesForImage: async (imageId) => {
        const db = await getDB();
        const notes = await db.getAllFromIndex('categoryNotes', 'by-image', imageId);
        for (const note of notes) {
            await db.delete('categoryNotes', note.id);
        }
        set(state => ({
            categoryNotes: state.categoryNotes.filter(n => n.imageId !== imageId)
        }));
    },

    // ─── Edit Notes ──────────────────────────────────────────────────────────

    addEditNote: async (projectId, imageId, categoryId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNote: EditNote = {
            id,
            projectId,
            imageId,
            categoryId,
            text: '',
            x,
            y,
            width: 240,
            height: 160,
            checkedPrompts: [],
            isMinimized: false,
        };
        await db.put('editNotes', newNote);
        set(state => ({ editNotes: [...state.editNotes, newNote] }));
        return id;
    },

    updateEditNote: async (id, updates) => {
        const db = await getDB();
        const note = await db.get('editNotes', id);
        if (note) {
            const updated = { ...note, ...updates };
            await db.put('editNotes', updated);
            set(state => ({
                editNotes: state.editNotes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removeEditNote: async (id) => {
        const db = await getDB();
        await db.delete('editNotes', id);
        set(state => ({
            editNotes: state.editNotes.filter(n => n.id !== id)
        }));
    },

    removeEditNotesForImage: async (imageId) => {
        const db = await getDB();
        const notes = await db.getAllFromIndex('editNotes', 'by-image', imageId);
        for (const note of notes) {
            await db.delete('editNotes', note.id);
        }
        set(state => ({
            editNotes: state.editNotes.filter(n => n.imageId !== imageId)
        }));
    },

    // ─── Prompt Nodes ────────────────────────────────────────────────────────

    addPromptNode: async (projectId, imageId, text, model, promptType, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNode: PromptNode = {
            id,
            projectId,
            imageId,
            text,
            model,
            promptType,
            x,
            y,
            width: 280,
            isMinimized: false,
            createdAt: Date.now(),
        };
        await db.put('promptNodes', newNode);
        set(state => ({ promptNodes: [...state.promptNodes, newNode] }));
        return id;
    },

    updatePromptNode: async (id, updates) => {
        const db = await getDB();
        const node = await db.get('promptNodes', id);
        if (node) {
            const updated = { ...node, ...updates };
            await db.put('promptNodes', updated);
            set(state => ({
                promptNodes: state.promptNodes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removePromptNode: async (id) => {
        const db = await getDB();
        await db.delete('promptNodes', id);
        set(state => ({
            promptNodes: state.promptNodes.filter(n => n.id !== id)
        }));
    },

    autoArrangeNotes: async (images) => {
        const db = await getDB();
        const { categoryNotes, editNotes } = get();
        const DISPLAY_MAX_WIDTH = 350;
        const GAP = 18;
        const MINIMIZED_H = 36;
        const NOTE_GAP = 6;

        const newCategoryNotes = [...categoryNotes];
        const newEditNotes = [...editNotes];

        for (const img of images) {
            const displayW = img.displayWidth ?? Math.min(img.width, DISPLAY_MAX_WIDTH);
            const noteX = img.x + displayW + GAP;
            let noteY = img.y;

            const imgCatNotes = newCategoryNotes.filter(n => n.imageId === img.id);
            const imgEditNotes = newEditNotes.filter(n => n.imageId === img.id);

            for (const note of imgCatNotes) {
                const updated = { ...note, x: noteX, y: noteY, isMinimized: true };
                await db.put('categoryNotes', updated);
                const idx = newCategoryNotes.findIndex(n => n.id === note.id);
                if (idx >= 0) newCategoryNotes[idx] = updated;
                noteY += MINIMIZED_H + NOTE_GAP;
            }

            for (const note of imgEditNotes) {
                const updated = { ...note, x: noteX, y: noteY, isMinimized: true };
                await db.put('editNotes', updated);
                const idx = newEditNotes.findIndex(n => n.id === note.id);
                if (idx >= 0) newEditNotes[idx] = updated;
                noteY += MINIMIZED_H + NOTE_GAP;
            }
        }

        set({ categoryNotes: newCategoryNotes, editNotes: newEditNotes });
    },
}));
