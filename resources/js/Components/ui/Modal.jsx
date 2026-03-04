import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open = false, onClose, title, children }) {
    // SSR guard
    if (typeof document === 'undefined') return null;

    const handleEscape = useCallback(
        (e) => {
            if (e.key === 'Escape' && open) {
                onClose?.();
            }
        },
        [open, onClose],
    );

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handleEscape]);

    // Body scroll lock
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                onClick={() => onClose?.()}
            />

            {/* Modal Panel */}
            <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    {title && (
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    )}
                    <button
                        type="button"
                        onClick={() => onClose?.()}
                        className="ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                    >
                        <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
