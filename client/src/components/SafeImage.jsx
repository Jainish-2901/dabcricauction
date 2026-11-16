import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function SafeImage({
    src,
    alt = '',
    className = '',
    fallback = null,
    previewable = false,
    previewTitle = '',
    onClick,
    ...props
}) {
    const [hasError, setHasError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!src || (typeof src === 'string' && !src.trim()) || hasError) {
        return fallback;
    }

    const handleClick = (e) => {
        if (previewable) {
            e.stopPropagation();
            setIsOpen(true);
        }
        if (onClick) onClick(e);
    };

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={`${className} ${previewable ? 'cursor-zoom-in transition-transform active:scale-95' : ''}`}
                onError={() => setHasError(true)}
                onClick={handleClick}
                title={previewable ? (previewTitle || alt ? `Click to view full photo of ${previewTitle || alt}` : 'Click to view full photo') : props.title}
                {...props}
            />

            {previewable && isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 pt-8 sm:pt-4 select-none animate-fadeIn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                >
                    {/* Top Control Bar */}
                    <div
                        className="w-full max-w-4xl flex items-center justify-between mb-3 text-white px-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-400/30">
                                Photo Preview
                            </span>
                            {(previewTitle || alt) && (
                                <h3 className="text-base sm:text-lg font-bold truncate text-white/90">
                                    {previewTitle || alt}
                                </h3>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white transition-all cursor-pointer shadow-lg hover:rotate-90"
                            title="Close preview (Esc)"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Image Viewport */}
                    <div
                        className="relative max-w-[92vw] max-h-[82vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt || 'Full Preview'}
                            className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/10"
                        />
                    </div>

                    {/* Bottom Helper Hint */}
                    <p className="mt-3 text-xs text-white/60 font-medium tracking-wide">
                        Click anywhere or press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[11px] font-mono text-white/90">ESC</kbd> to close
                    </p>
                </div>,
                document.body
            )}
        </>
    );
}


