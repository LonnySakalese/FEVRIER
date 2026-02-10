// ============================================================
// PWA INSTALL BANNER
// ============================================================

let deferredPrompt = null;

/**
 * Initialize the PWA install banner system
 */
export function initInstallBanner() {
    // Don't show if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        return;
    }

    // Don't show if user dismissed it
    if (localStorage.getItem('pwaInstallDismissed') === 'true') {
        return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });
}

function showInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (!banner) return;
    banner.style.display = 'flex';
    // Trigger slide-up animation
    requestAnimationFrame(() => {
        banner.classList.add('visible');
    });
}

export function dismissInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (!banner) return;
    banner.classList.remove('visible');
    setTimeout(() => {
        banner.style.display = 'none';
    }, 300);
    localStorage.setItem('pwaInstallDismissed', 'true');
}

export async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('✅ PWA installée');
    }

    deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 300);
    }
}
