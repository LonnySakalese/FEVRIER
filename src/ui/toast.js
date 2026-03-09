// ============================================================
// SYSTÈME DE POPUP/TOAST NOTIFICATIONS
// ============================================================

export const ToastManager = {
    activeToasts: [],
    messageHistory: new Map(), // Track message occurrences
    pendingBadges: [], // Queue for badge notifications
    badgeTimeout: null,
    
    MAX_SIMULTANEOUS: 3, // Max toasts on screen
    MAX_SAME_MESSAGE: 2, // Max times same message can appear
    
    updatePositions() {
        this.activeToasts.forEach((toast, index) => {
            const yOffset = 20 + (index * 70); // 70px spacing between toasts
            toast.style.top = `${yOffset}px`;
        });
    },
    
    removeToast(toast) {
        const index = this.activeToasts.indexOf(toast);
        if (index > -1) {
            this.activeToasts.splice(index, 1);
            this.updatePositions();
        }
    },
    
    shouldShowMessage(message, type) {
        // Always allow error messages
        if (type === 'error') return true;
        
        // Check if we've shown this message too many times
        const key = `${type}:${message}`;
        const count = this.messageHistory.get(key) || 0;
        
        if (count >= this.MAX_SAME_MESSAGE) {
            console.log(`🚫 Toast suppressed (shown ${count} times): ${message}`);
            return false;
        }
        
        return true;
    },
    
    trackMessage(message, type) {
        const key = `${type}:${message}`;
        const count = this.messageHistory.get(key) || 0;
        this.messageHistory.set(key, count + 1);
    },
    
    // Clear old entries periodically to prevent memory leak
    cleanupHistory() {
        if (this.messageHistory.size > 50) {
            console.log('🧹 Cleaning toast history');
            this.messageHistory.clear();
        }
    },

    show(message, type = 'info', duration = 4000) {
        // Badge notifications go through special handler
        if (type === 'badge') {
            return this.handleBadgeNotification(message, duration);
        }
        
        // Check if we should show this message
        if (!this.shouldShowMessage(message, type)) {
            return null;
        }
        
        // Remove oldest toast if we're at max capacity
        if (this.activeToasts.length >= this.MAX_SIMULTANEOUS) {
            this.closeToast(this.activeToasts[0]);
        }
        
        // Track this message
        this.trackMessage(message, type);
        this.cleanupHistory();
        
        const colors = {
            success: { bg: '#0a2a0a', border: '#19E639', icon: '✓' },
            error:   { bg: '#2a0a0a', border: '#E74C3C', icon: '✕' },
            warning: { bg: '#2a1f0a', border: '#F39C12', icon: '!' },
            info:    { bg: '#0a1a2a', border: '#3498DB', icon: 'i' },
            badge:   { bg: '#2a1a0a', border: '#FFD700', icon: '🏆' }
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.className = 'oc-toast';
        toast.innerHTML = `
            <span style="min-width:24px;height:24px;border-radius:50%;background:${c.border};color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">${c.icon}</span>
            <span style="color:#F5F5F0;font-size:0.85rem;font-weight:600;flex:1;">${message}</span>
            <button style="background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;padding:0 4px;" onclick="ToastManager.closeToast(this.parentElement)">×</button>
        `;
        
        const yOffset = 20 + (this.activeToasts.length * 70);
        toast.style.cssText = `
            position: fixed;
            top: ${yOffset}px;
            left: 50%;
            transform: translateX(-50%);
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
            z-index: 999999;
            animation: toastIn 0.3s ease-out;
            pointer-events: auto;
            transition: top 0.3s ease-out;
        `;

        // Add to active list and update positions
        this.activeToasts.push(toast);
        document.body.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                this.closeToast(toast);
            }, duration);
        }

        return toast;
    },
    
    // Special handler for badge notifications
    handleBadgeNotification(badgeName, duration = 4000) {
        this.pendingBadges.push(badgeName);
        
        // Clear existing timeout
        if (this.badgeTimeout) {
            clearTimeout(this.badgeTimeout);
        }
        
        // Wait a bit to collect multiple badges, then show grouped notification
        this.badgeTimeout = setTimeout(() => {
            this.showGroupedBadgeNotification(duration);
        }, 800); // 800ms delay to collect badges
        
        return null; // Don't return individual toast
    },
    
    showGroupedBadgeNotification(duration) {
        if (this.pendingBadges.length === 0) return;
        
        let message;
        if (this.pendingBadges.length === 1) {
            message = `🏆 Badge débloqué : ${this.pendingBadges[0]}`;
        } else if (this.pendingBadges.length <= 3) {
            message = `🏆 ${this.pendingBadges.length} badges débloqués : ${this.pendingBadges.join(', ')}`;
        } else {
            message = `🏆 ${this.pendingBadges.length} badges débloqués ! Bravo WARRIOR !`;
        }
        
        // Clear pending badges
        this.pendingBadges = [];
        
        // Force show badge notification (bypass duplicate check)
        return this.showBadgeToast(message, duration);
    },
    
    showBadgeToast(message, duration) {
        const colors = { bg: '#2a1a0a', border: '#FFD700', icon: '🏆' };
        
        // Remove oldest if at capacity
        if (this.activeToasts.length >= this.MAX_SIMULTANEOUS) {
            this.closeToast(this.activeToasts[0]);
        }
        
        const toast = document.createElement('div');
        toast.className = 'oc-toast oc-toast-badge';
        toast.innerHTML = `
            <span style="min-width:28px;height:28px;border-radius:50%;background:${colors.border};color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;">${colors.icon}</span>
            <span style="color:#FFD700;font-size:0.9rem;font-weight:700;flex:1;">${message}</span>
            <button style="background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;padding:0 4px;" onclick="ToastManager.closeToast(this.parentElement)">×</button>
        `;
        
        const yOffset = 20 + (this.activeToasts.length * 70);
        toast.style.cssText = `
            position: fixed;
            top: ${yOffset}px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors.bg};
            border: 2px solid ${colors.border};
            border-radius: 12px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 380px;
            width: calc(100% - 40px);
            box-shadow: 0 12px 40px rgba(255,215,0,0.3), 0 4px 16px rgba(0,0,0,0.6);
            z-index: 999999;
            animation: toastIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: auto;
            transition: top 0.3s ease-out;
        `;
        
        this.activeToasts.push(toast);
        document.body.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => {
                this.closeToast(toast);
            }, duration + 1000); // Badge notifications stay longer
        }
        
        return toast;
    },
    
    closeToast(toast) {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => {
            toast.remove();
            this.removeToast(toast);
        }, 300);
    },

    success(msg, d) { return this.show(msg, 'success', d); },
    error(msg, d) { return this.show(msg, 'error', d); },
    warning(msg, d) { return this.show(msg, 'warning', d); },
    info(msg, d) { return this.show(msg, 'info', d); },
    badge(msg, d) { return this.show(msg, 'badge', d); }
};

export function showPopup(message, type = 'info', duration = 4000) {
    return ToastManager.show(message, type, duration);
}

// Expose to window for onclick handlers
window.ToastManager = ToastManager;
