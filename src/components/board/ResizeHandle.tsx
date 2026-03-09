import React from 'react';

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface ResizeHandleProps {
    corner: Corner;
    onResizeStart: (e: React.MouseEvent, corner: Corner) => void;
}

export function ResizeHandle({ corner, onResizeStart }: ResizeHandleProps) {
    const getPositionStyles = () => {
        switch (corner) {
            case 'nw': return { top: -4, left: -4, cursor: 'nwse-resize' };
            case 'ne': return { top: -4, right: -4, cursor: 'nesw-resize' };
            case 'sw': return { bottom: -4, left: -4, cursor: 'nesw-resize' };
            case 'se': return { bottom: -4, right: -4, cursor: 'nwse-resize' };
        }
    };

    return (
        <div
            className="absolute bg-white border border-[#6366f1] w-2.5 h-2.5 rounded-full z-10 hover:scale-125 transition-transform shadow hover:shadow-lg"
            style={getPositionStyles()}
            onMouseDown={(e) => onResizeStart(e, corner)}
        />
    );
}
