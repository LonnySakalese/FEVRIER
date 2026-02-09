// ============================================================
// CONFETTI ANIMATION
// ============================================================

export function triggerConfetti() {
    const colors = ['#F5F5F0', '#D4D4CF', '#A3A39E'];
    const confettiCount = 50;
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed; width: 10px; height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw; top: -10px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            pointer-events: none; z-index: 9999;
            animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 100]);
    }
}
