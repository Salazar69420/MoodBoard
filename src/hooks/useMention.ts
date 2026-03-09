import { useState, useCallback } from 'react';
import type { BoardImage } from '../types';

export interface MentionItem {
    id: string;
    name: string;       // display name (label or filename)
    slug: string;       // what gets inserted after @
}

export function useMention(images: BoardImage[]) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState(-1);

    const items: MentionItem[] = images
        .filter(img => img.label)
        .map(img => ({
            id: img.id,
            name: img.label,
            slug: img.label.replace(/\s+/g, '_'),
        }));

    const filteredItems = query
        ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
        : items;

    const handleChange = useCallback((value: string, cursorPos: number) => {
        const before = value.slice(0, cursorPos);
        const atIdx = before.lastIndexOf('@');

        if (atIdx >= 0) {
            const afterAt = before.slice(atIdx + 1);
            // Only activate if no whitespace after @
            if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                setIsOpen(true);
                setQuery(afterAt);
                setMentionStart(atIdx);
                setSelectedIndex(0);
                return;
            }
        }
        setIsOpen(false);
        setMentionStart(-1);
    }, []);

    const _doInsert = useCallback((
        item: MentionItem,
        value: string,
        cursorPos: number,
        currentMentionStart: number,
        onChange: (newValue: string, newCursorPos: number) => void
    ) => {
        const insertion = `@${item.slug} `;
        const before = value.slice(0, currentMentionStart);
        const after = value.slice(cursorPos);
        const newValue = before + insertion + after;
        const newCursorPos = before.length + insertion.length;
        onChange(newValue, newCursorPos);
        setIsOpen(false);
        setMentionStart(-1);
    }, []);

    const handleKeyDown = useCallback((
        e: React.KeyboardEvent,
        value: string,
        cursorPos: number,
        onChange: (newValue: string, newCursorPos: number) => void
    ) => {
        if (!isOpen || filteredItems.length === 0) return false;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
            return true;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
            return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            const item = filteredItems[selectedIndex];
            if (item) {
                e.preventDefault();
                _doInsert(item, value, cursorPos, mentionStart, onChange);
                return true;
            }
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
            return true;
        }
        return false;
    }, [isOpen, filteredItems, selectedIndex, mentionStart, _doInsert]);

    const selectItem = useCallback((
        item: MentionItem,
        value: string,
        cursorPos: number,
        onChange: (newValue: string, newCursorPos: number) => void
    ) => {
        _doInsert(item, value, cursorPos, mentionStart, onChange);
    }, [mentionStart, _doInsert]);

    const close = useCallback(() => {
        setIsOpen(false);
        setMentionStart(-1);
    }, []);

    return {
        isOpen: isOpen && filteredItems.length > 0,
        query,
        filteredItems,
        selectedIndex,
        handleChange,
        handleKeyDown,
        selectItem,
        close,
    };
}
