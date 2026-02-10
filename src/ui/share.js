// ============================================================
// SOCIAL SHARING - "MA JOURNÉE" SHARE IMAGE
// ============================================================

import { appState, habits } from '../services/state.js';
import { getData, getDateKey } from '../services/storage.js';
import { getRank } from '../core/ranks.js';

/**
 * Generate a 1080x1080 share image using Canvas API
 */
export async function generateShareImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle border
    ctx.strokeStyle = '#1E1E1E';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1000, 1000);

    // Accent line at top
    ctx.fillStyle = '#19E639';
    ctx.fillRect(40, 40, 1000, 4);

    // Title
    ctx.fillStyle = '#F5F5F0';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROJET FEVRIER', 540, 130);

    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    ctx.fillStyle = '#8A8A85';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(dateStr.toUpperCase(), 540, 180);

    // Get today's data
    const data = getData();
    const dateKey = getDateKey(now);
    const todayData = data.days?.[dateKey] || {};

    // Calculate score
    const currentHabits = habits || [];
    let completed = 0;
    let total = currentHabits.length;

    currentHabits.forEach(h => {
        if (todayData[h.id]) completed++;
    });

    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Score big
    ctx.fillStyle = score === 100 ? '#19E639' : '#F5F5F0';
    ctx.font = 'bold 160px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(score + '%', 540, 360);

    // Score label
    ctx.fillStyle = '#8A8A85';
    ctx.font = '30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${completed}/${total} MISSIONS`, 540, 410);

    // Rank
    const rankInfo = getRank(score);
    if (rankInfo) {
        ctx.fillStyle = rankInfo.color || '#F5F5F0';
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(rankInfo.name || 'DÉBUTANT', 540, 475);
    }

    // Streak
    const streak = data.stats?.currentStreak || 0;
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`🔥 ${streak} jour${streak > 1 ? 's' : ''} de streak`, 540, 530);

    // Habits list
    const startY = 590;
    const lineHeight = 52;
    const maxVisible = Math.min(currentHabits.length, 8);

    ctx.textAlign = 'left';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (let i = 0; i < maxVisible; i++) {
        const h = currentHabits[i];
        const done = todayData[h.id] || false;
        const y = startY + i * lineHeight;

        const icon = done ? '✅' : '⬜';
        ctx.fillStyle = done ? '#F5F5F0' : '#5A5A55';
        ctx.fillText(`${icon}  ${h.icon || '🎯'} ${h.name}`, 120, y);
    }

    if (currentHabits.length > maxVisible) {
        ctx.fillStyle = '#5A5A55';
        ctx.fillText(`   +${currentHabits.length - maxVisible} autres...`, 120, startY + maxVisible * lineHeight);
    }

    // Watermark
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3A3A3A';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('projetfevrier.app', 540, 1030);

    // Bottom accent line
    ctx.fillStyle = '#19E639';
    ctx.fillRect(40, 1036, 1000, 4);

    return canvas;
}

/**
 * Share today's progress as an image
 */
export async function shareDay() {
    try {
        const canvas = await generateShareImage();

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'projet-fevrier-jour.png', { type: 'image/png' });

        // Try Web Share API (mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'PROJET FEVRIER - Ma Journée',
                text: 'Mon suivi du jour 💪',
                files: [file]
            });
        } else {
            // Fallback: download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'projet-fevrier-jour.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.log('Partage annulé ou erreur:', e);
    }
}
