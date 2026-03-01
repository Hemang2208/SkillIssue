import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Generic confirmation dialog.
 *
 * Props:
 *   title       – e.g. "Delete Skill"
 *   message     – body text / JSX
 *   confirmLabel – label for the destructive button (default "Delete")
 *   onConfirm   – async callback when confirmed
 *   onCancel    – callback when dismissed
 *   working     – bool, disables buttons while async op runs
 */
export default function ConfirmDialog({
    title = 'Are you sure?',
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onCancel,
    working = false,
}) {
    // Close on Escape
    useEffect(() => {
        const h = (e) => e.key === 'Escape' && !working && onCancel()
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [working, onCancel])

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => !working && onCancel()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className="relative w-full max-w-sm rounded-2xl bg-[#0d1225] border border-white/[0.08] shadow-2xl p-6 animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <h3 className="font-clash font-bold text-xl text-center mb-2">{title}</h3>
                {message && (
                    <p className="font-satoshi text-sm text-white/45 text-center leading-relaxed mb-6">
                        {message}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={working}
                        className="flex-1 py-3 rounded-xl border border-white/[0.08] text-white/50 font-satoshi text-sm hover:text-white/80 hover:border-white/20 transition-all disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={working}
                        className="flex-1 py-3 rounded-xl bg-red-500/90 text-white font-satoshi font-bold text-sm hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {working
                            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            : null
                        }
                        {working ? 'Deleting…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
