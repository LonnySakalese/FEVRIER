// ============================================================
// SYSTÈME DE POPUP/TOAST NOTIFICATIONS
// ============================================================

export const ToastManager = {
    show(message, type = 'info', duration = 4000) {
        // Create a fresh overlay each time — no container, no stacking issues
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 2147483647;
            pointer-events: none;
            display: flex;
            justify-content: center;
            padding-top: 20px;
        `;

        const colors = {
            success: { bg: '#0a2a0a', border: '#19E639', icon: '✓' },
            error:   { bg: '#2a0a0a', border: '#E74C3C', icon: '✕' },
            warning: { bg: '#2a1f0a', border: '#F39C12', icon: '!' },
            info:    { bg: '#0a1a2a', border: '#3498DB', icon: 'i' }
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
            pointer-events: auto;
            background: ${c.bg};
            border: 1px solid ${c.border};
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 360px;
            width: calc(100% - 40px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            animation: toastIn 0.3s ease-out;
        `;

        toast.innerHTML = `
            <span style="min-width:24px;height:24px;border-radius:50%;background:${c.border};color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">${c.icon}</span>
            <span style="color:#F5F5F0;font-size:0.85rem;font-weight:600;flex:1;">${message}</span>
            <button style="background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;padding:0 4px;" onclick="this.closest('[data-toast-overlay]').remove()">×</button>
        `;

        overlay.setAttribute('data-toast-overlay', '');
        overlay.appendChild(toast);
        document.body.appendChild(overlay);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'toastOut 0.3s ease-in forwards';
                setTimeout(() => overlay.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(msg, d) { return this.show(msg, 'success', d); },
    error(msg, d) { return this.show(msg, 'error', d); },
    warning(msg, d) { return this.show(msg, 'warning', d); },
    info(msg, d) { return this.show(msg, 'info', d); }
};

export function showPopup(message, type = 'info', duration = 4000) {
    return ToastManager.show(message, type, duration);
}
