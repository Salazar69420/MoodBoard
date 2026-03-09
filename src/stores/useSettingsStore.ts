import { create } from 'zustand';

export interface ModelEntry {
    id: string;
    label: string;
    provider: string;
    isCustom?: boolean;
}

interface SettingsStore {
    apiKey: string;
    model: string;
    customModels: ModelEntry[];
    showSettings: boolean;

    setApiKey: (key: string) => void;
    setModel: (model: string) => void;
    addCustomModel: (id: string) => void;
    removeCustomModel: (id: string) => void;
    toggleSettings: () => void;
    closeSettings: () => void;
}

const STORAGE_KEY = 'moodboard-settings';

function loadFromStorage(): { apiKey?: string; model?: string; customModels?: ModelEntry[] } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
}

function saveToStorage(data: { apiKey: string; model: string; customModels: ModelEntry[] }) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
}

/** Parse an OpenRouter model ID like "openai/gpt-5.4-pro" into a label + provider */
function parseModelId(id: string): { label: string; provider: string } {
    const parts = id.split('/');
    const provider = parts.length > 1 ? parts[0] : 'Custom';
    const rawName = parts.length > 1 ? parts.slice(1).join('/') : id;

    // Convert slug to title  e.g. "gpt-5.4-pro" → "GPT 5.4 Pro"
    const label = rawName
        .split(/[-_]/)
        .map(w => {
            // Keep known acronyms uppercase
            if (/^(gpt|vl|xl|llm|ai|rl)$/i.test(w)) return w.toUpperCase();
            // Numbers stay as-is
            if (/^\d/.test(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(' ');

    // Capitalize provider
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

    return { label, provider: providerLabel };
}

export const DEFAULT_MODELS: ModelEntry[] = [
    { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic' },
    { id: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'meta-llama/llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision', provider: 'Meta' },
    { id: 'qwen/qwen2.5-vl-72b-instruct', label: 'Qwen 2.5 VL 72B', provider: 'Qwen' },
];

const stored = loadFromStorage();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    apiKey: stored.apiKey || '',
    model: stored.model || 'google/gemini-2.0-flash-001',
    customModels: stored.customModels || [],
    showSettings: false,

    setApiKey: (apiKey) => {
        set({ apiKey });
        saveToStorage({ apiKey, model: get().model, customModels: get().customModels });
    },

    setModel: (model) => {
        set({ model });
        saveToStorage({ apiKey: get().apiKey, model, customModels: get().customModels });
    },

    addCustomModel: (id) => {
        const trimmed = id.trim();
        if (!trimmed) return;

        // Don't add duplicates
        const all = [...DEFAULT_MODELS, ...get().customModels];
        if (all.some(m => m.id === trimmed)) return;

        const { label, provider } = parseModelId(trimmed);
        const newModel: ModelEntry = { id: trimmed, label, provider, isCustom: true };
        const customModels = [...get().customModels, newModel];
        set({ customModels, model: trimmed });
        saveToStorage({ apiKey: get().apiKey, model: trimmed, customModels });
    },

    removeCustomModel: (id) => {
        const customModels = get().customModels.filter(m => m.id !== id);
        const newModel = get().model === id ? DEFAULT_MODELS[0].id : get().model;
        set({ customModels, model: newModel });
        saveToStorage({ apiKey: get().apiKey, model: newModel, customModels });
    },

    toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),
    closeSettings: () => set({ showSettings: false }),
}));
