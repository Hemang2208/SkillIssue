import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Don't show if already dismissed this session
        if (sessionStorage.getItem('pwa-dismissed')) return

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            // Small delay so it doesn't pop up instantly on page load
            setTimeout(() => setVisible(true), 3000)
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setVisible(false)
            setDeferredPrompt(null)
        }
    }

    const handleDismiss = () => {
        setVisible(false)
        setDismissed(true)
        sessionStorage.setItem('pwa-dismissed', '1')
    }

    if (!visible || dismissed) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9998,
                width: 'min(360px, 90vw)',
                background: 'linear-gradient(135deg, #111827 0%, #0d1526 100%)',
                border: '1px solid rgba(75,169,255,0.25)',
                borderRadius: '16px',
                padding: '16px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(75,169,255,0.08)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'slideUpIn 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
        >
            <style>{`
                @keyframes slideUpIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            {/* App icon */}
            <img
                src="/favicon.png"
                alt="Skill Issue"
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
            />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#f0f4ff', lineHeight: 1.3 }}>
                    Install Skill Issue
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(180,198,230,0.7)', lineHeight: 1.4 }}>
                    Add to home screen for quick access
                </p>
            </div>

            {/* Install button */}
            <button
                onClick={handleInstall}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #4ba9ff, #2563eb)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '7px 12px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                }}
            >
                <Download size={13} />
                Install
            </button>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(180,198,230,0.5)',
                    cursor: 'pointer',
                    padding: 4,
                    flexShrink: 0,
                    lineHeight: 1,
                }}
            >
                <X size={16} />
            </button>
        </div>
    )
}
