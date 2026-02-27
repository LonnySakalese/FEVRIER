// ============================================================
// SYSTÈME DE POPUP/TOAST NOTIFICATIONS
// ============================================================

export const ToastManager = {
    container: null,

    init() {
        if (this.container && document.body.contains(this.container)) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'alert');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        // Force z-index inline to guarantee it's always on top
        this.container.style.setProperty('position', 'fixed', 'important');
        this.container.style.setProperty('top', '20px', 'important');
        this.container.style.setProperty('left', '50%', 'important');
        this.container.style.setProperty('transform', 'translateX(-50%)', 'important');
        this.container.style.setProperty('z-index', '2147483647', 'important');
        this.container.style.setProperty('display', 'flex', 'important');
        this.container.style.setProperty('flex-direction', 'column');
        this.container.style.setProperty('gap', '10px');
        this.container.style.setProperty('width', 'calc(100% - 40px)');
        this.container.style.setProperty('max-width', '400px');
        this.container.style.setProperty('pointer-events', 'none');
        document.body.appendChild(this.container);
    },

    getIcon(type) {
        const icons = {
            success: '●',
            error: '✕',
            warning: '!',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    show(message, type = 'info', duration = 4000) {
        this.init();
        // Always append to body as last child
        document.body.appendChild(this.container);

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('tabindex', '-1');

        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = this.getIcon(type);
        icon.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'toast-content';

        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Fermer la notification');
        closeBtn.onclick = () => this.close(toast);

        const progress = document.createElement('div');
        progress.className = 'toast-progress';
        progress.style.animationDuration = `${duration}ms`;

        content.appendChild(msg);
        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        toast.appendChild(progress);

        this.container.appendChild(toast);
        toast.focus();

        if (duration > 0) {
            setTimeout(() => this.close(toast), duration);
        }

        return toast;
    },

    close(toast) {
        if (!toast || toast.classList.contains('toast-closing')) return;
        toast.classList.add('toast-closing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// Fonction globale simplifiée pour remplacer alert()
export function showPopup(message, type = 'info', duration = 4000) {
    return ToastManager.show(message, type, duration);
}
