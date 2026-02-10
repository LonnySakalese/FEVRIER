// ============================================================
// EXPORT CSV
// ============================================================

import { getData, getDateKey } from '../services/storage.js';
import { appState, habits } from '../services/state.js';
import { showPopup } from './toast.js';

export function exportDataCSV() {
    const data = getData();
    const days = data.days || {};
    const dayKeys = Object.keys(days).sort();

    if (dayKeys.length === 0) {
        showPopup('Aucune donnée à exporter', 'warning');
        return;
    }

    const rows = [['Date', 'Habitude', 'Complétée', 'Score du jour']];

    for (const dateKey of dayKeys) {
        const dayData = days[dateKey];
        // Calculate day score
        const habitIds = Object.keys(dayData);
        const totalHabits = habitIds.length || 1;
        const completedCount = habitIds.filter(id => dayData[id]).length;
        const dayScore = Math.round((completedCount / totalHabits) * 100);

        for (const habitId of habitIds) {
            const completed = dayData[habitId] ? 'oui' : 'non';
            // Try to find habit name
            const habit = habits.find(h => h.id === habitId);
            const habitName = habit ? habit.name : habitId;
            rows.push([dateKey, habitName, completed, dayScore + '%']);
        }
    }

    const csvContent = rows.map(row =>
        row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',')
    ).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const today = getDateKey(new Date());
    const link = document.createElement('a');
    link.href = url;
    link.download = `fevrier-export-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showPopup('📤 Export CSV téléchargé !', 'success');
}
