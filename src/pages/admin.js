/**
 * admin.js — Admin Dashboard (Advanced)
 * Stats d'engagement, graphes, gestion users/groups/challenges
 */
import { isAdmin } from '../core/admin.js';
import { appState } from '../services/state.js';

let cachedUsers = null;
let cachedGroups = null;

export async function checkAdminButton() {
    const btn = document.getElementById('adminPanelBtn');
    if (!btn) return;
    const uid = appState.currentUser?.uid;
    if (uid && await isAdmin(uid)) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

export async function loadAdminPanel() {
    const uid = appState.currentUser?.uid;
    if (!uid || !(await isAdmin(uid))) return;

    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    if (menu) menu.style.display = 'block';
    if (detail) detail.style.display = 'none';

    const db = firebase.firestore();

    // Load all data
    try {
        const usersSnap = await db.collection('users').get();
        cachedUsers = usersSnap.docs;
        const el = document.getElementById('adminTotalUsers');
        if (el) el.textContent = usersSnap.size;
    } catch (e) { console.warn('Admin: users error', e); }

    try {
        const groupsSnap = await db.collection('groups').get();
        cachedGroups = groupsSnap.docs;
        const el = document.getElementById('adminTotalGroups');
        if (el) el.textContent = groupsSnap.size;
    } catch (e) { console.warn('Admin: groups error', e); }

    try {
        let total = 0;
        if (cachedGroups) {
            for (const g of cachedGroups) {
                const chSnap = await g.ref.collection('challenges').get();
                total += chSnap.size;
            }
        }
        const el = document.getElementById('adminTotalChallenges');
        if (el) el.textContent = total;
    } catch (e) { console.warn('Admin: challenges error', e); }

    // Render engagement stats in menu
    renderEngagementStats();
}

function renderEngagementStats() {
    if (!cachedUsers) return;
    const statsContainer = document.getElementById('adminEngagementStats');
    if (!statsContainer) return;

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    let activeToday = 0, activeWeek = 0, activeMonth = 0;
    let totalXP = 0, totalLevel = 0;
    let withPseudo = 0, withGroups = 0;

    cachedUsers.forEach(doc => {
        const d = doc.data();
        const lastLogin = d.lastLogin?.toDate?.();
        if (lastLogin) {
            if (lastLogin > oneDayAgo) activeToday++;
            if (lastLogin > sevenDaysAgo) activeWeek++;
            if (lastLogin > thirtyDaysAgo) activeMonth++;
        }
        totalXP += d.xp || 0;
        totalLevel += d.level || 1;
        if (d.pseudo && d.pseudo !== 'Anonyme') withPseudo++;
        if (d.groups && d.groups.length > 0) withGroups++;
    });

    const total = cachedUsers.length || 1;
    const avgLevel = (totalLevel / total).toFixed(1);
    const retentionRate = total > 0 ? Math.round((activeWeek / total) * 100) : 0;
    const profileCompletion = Math.round((withPseudo / total) * 100);
    const socialEngagement = Math.round((withGroups / total) * 100);

    statsContainer.innerHTML = `
        <div class="admin-section-label">VUE D'ENSEMBLE</div>
        <div class="admin-stats-grid">
            <div class="admin-stat-card admin-stat-highlight">
                <div class="admin-stat-value">${activeToday}</div>
                <div class="admin-stat-label">Actifs aujourd'hui</div>
                <div class="admin-stat-bar"><div class="admin-stat-bar-fill" style="width: ${Math.min((activeToday/total)*100, 100)}%; background: #2ECC71;"></div></div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-value">${activeWeek}</div>
                <div class="admin-stat-label">Actifs cette semaine</div>
                <div class="admin-stat-bar"><div class="admin-stat-bar-fill" style="width: ${Math.min((activeWeek/total)*100, 100)}%; background: #3498DB;"></div></div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-value">${activeMonth}</div>
                <div class="admin-stat-label">Actifs ce mois</div>
                <div class="admin-stat-bar"><div class="admin-stat-bar-fill" style="width: ${Math.min((activeMonth/total)*100, 100)}%; background: #9B59B6;"></div></div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-value">${retentionRate}%</div>
                <div class="admin-stat-label">Rétention 7j</div>
                <div class="admin-stat-bar"><div class="admin-stat-bar-fill" style="width: ${retentionRate}%; background: ${retentionRate > 50 ? '#2ECC71' : retentionRate > 25 ? '#F39C12' : '#E74C3C'};"></div></div>
            </div>
        </div>

        <div class="admin-metrics-row">
            <div class="admin-metric">
                <div class="admin-metric-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                <div class="admin-metric-info">
                    <div class="admin-metric-value">${totalXP.toLocaleString()}</div>
                    <div class="admin-metric-label">XP total généré</div>
                </div>
            </div>
            <div class="admin-metric">
                <div class="admin-metric-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3498DB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
                <div class="admin-metric-info">
                    <div class="admin-metric-value">${avgLevel}</div>
                    <div class="admin-metric-label">Niveau moyen</div>
                </div>
            </div>
            <div class="admin-metric">
                <div class="admin-metric-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                <div class="admin-metric-info">
                    <div class="admin-metric-value">${profileCompletion}%</div>
                    <div class="admin-metric-label">Profils complétés</div>
                </div>
            </div>
            <div class="admin-metric">
                <div class="admin-metric-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B59B6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div class="admin-metric-info">
                    <div class="admin-metric-value">${socialEngagement}%</div>
                    <div class="admin-metric-label">Engagement social</div>
                </div>
            </div>
        </div>

        <div class="admin-section-label" style="margin-top: 24px;">GRAPHIQUES</div>
        <div class="admin-chart-card">
            <div class="admin-chart-title">Activité des 14 derniers jours</div>
            <canvas id="adminActivityChart" height="180"></canvas>
        </div>
        <div class="admin-chart-card">
            <div class="admin-chart-title">Répartition des niveaux</div>
            <canvas id="adminLevelChart" height="160"></canvas>
        </div>
        <div class="admin-chart-card">
            <div class="admin-chart-title">Engagement social</div>
            <canvas id="adminSocialChart" height="160"></canvas>
        </div>
    `;

    setTimeout(() => renderAdminCharts(), 50);
}

function renderAdminCharts() {
    if (!cachedUsers || typeof Chart === 'undefined') return;

    // ===== 1. Activity Chart (14 days) =====
    const actCtx = document.getElementById('adminActivityChart')?.getContext('2d');
    if (actCtx) {
        const days = 14;
        const labels = [];
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));

            let count = 0;
            cachedUsers.forEach(doc => {
                const ll = doc.data().lastLogin?.toDate?.();
                if (ll && ll >= dayStart && ll < dayEnd) count++;
            });
            data.push(count);
        }

        new Chart(actCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: data.map((v, i) => i === data.length - 1 ? '#2ECC71' : 'rgba(46,204,113,0.3)'),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 }, stepSize: 1 } }
                }
            }
        });
    }

    // ===== 2. Level Distribution =====
    const lvlCtx = document.getElementById('adminLevelChart')?.getContext('2d');
    if (lvlCtx) {
        const buckets = { '1-5': 0, '6-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41-50': 0 };
        cachedUsers.forEach(doc => {
            const lvl = doc.data().level || 1;
            if (lvl <= 5) buckets['1-5']++;
            else if (lvl <= 10) buckets['6-10']++;
            else if (lvl <= 20) buckets['11-20']++;
            else if (lvl <= 30) buckets['21-30']++;
            else if (lvl <= 40) buckets['31-40']++;
            else buckets['41-50']++;
        });

        const colors = ['#7B8FA1', '#4B9CD3', '#E74C3C', '#FFD700', '#9B59B6', '#FFFAF0'];
        new Chart(lvlCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    data: Object.values(buckets),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 }
                    }
                }
            }
        });
    }

    // ===== 3. Social Engagement =====
    const socCtx = document.getElementById('adminSocialChart')?.getContext('2d');
    if (socCtx) {
        let withGroups = 0, withoutGroups = 0;
        let withPseudo = 0, withoutPseudo = 0;

        cachedUsers.forEach(doc => {
            const d = doc.data();
            if (d.groups && d.groups.length > 0) withGroups++; else withoutGroups++;
            if (d.pseudo && d.pseudo !== 'Anonyme') withPseudo++; else withoutPseudo++;
        });

        new Chart(socCtx, {
            type: 'bar',
            data: {
                labels: ['Pseudo défini', 'Dans un groupe'],
                datasets: [
                    {
                        label: 'Oui',
                        data: [withPseudo, withGroups],
                        backgroundColor: '#2ECC71',
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                    {
                        label: 'Non',
                        data: [withoutPseudo, withoutGroups],
                        backgroundColor: 'rgba(231,76,60,0.3)',
                        borderRadius: 6,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: {
                    legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, usePointStyle: true, pointStyleWidth: 10 } }
                },
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } },
                    y: { stacked: true, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11, weight: 'bold' } } }
                }
            }
        });
    }
}

window.openAdminSection = function(section) {
    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    const title = document.getElementById('adminDetailTitle');
    const content = document.getElementById('adminDetailContent');
    if (!menu || !detail || !content) return;

    menu.style.display = 'none';
    detail.style.display = 'block';

    if (section === 'users') {
        title.textContent = 'UTILISATEURS';
        renderUsersList(content, cachedUsers || []);
    } else if (section === 'groups') {
        title.textContent = 'GROUPES';
        renderGroupsList(content, cachedGroups || []);
    } else if (section === 'challenges') {
        title.textContent = 'CHALLENGES';
        renderChallengesList(content);
    }
};

window.closeAdminSection = function() {
    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    if (menu) menu.style.display = 'block';
    if (detail) detail.style.display = 'none';
};

function renderUsersList(container, docs) {
    if (docs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun utilisateur</div>';
        return;
    }

    // Sort: most recent login first
    const sorted = [...docs].sort((a, b) => {
        const aT = a.data().lastLogin?.toDate?.()?.getTime() || 0;
        const bT = b.data().lastLogin?.toDate?.()?.getTime() || 0;
        return bT - aT;
    });

    const searchHtml = `<div class="admin-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="admin-search-input" id="adminUserSearch" placeholder="Rechercher un utilisateur..." oninput="filterAdminUsers()">
    </div>`;

    container.innerHTML = searchHtml + '<div id="adminUserList">' + renderUsersCards(sorted) + '</div>';
}

function renderUsersCards(docs) {
    return docs.map(doc => {
        const d = doc.data();
        const pseudo = d.pseudo || d.displayName || 'Sans pseudo';
        const avatar = d.avatar || '—';
        const email = d.email || '';
        const level = d.level || 1;
        const xp = d.xp || 0;
        const groups = d.groups?.length || 0;
        const lastLogin = d.lastLogin?.toDate?.();
        const lastStr = lastLogin ? timeSince(lastLogin) : 'jamais';
        const isOnline = lastLogin && (Date.now() - lastLogin.getTime() < 5 * 60 * 1000);

        return `<div class="admin-user-card" data-search="${pseudo.toLowerCase()} ${email.toLowerCase()}">
            <div class="admin-user-avatar">${avatar}</div>
            <div class="admin-user-info">
                <div class="admin-user-name">
                    ${isOnline ? '<span class="admin-online-dot"></span>' : ''}
                    ${escapeHtml(pseudo)}
                </div>
                <div class="admin-user-email">${escapeHtml(email)}</div>
                <div class="admin-user-tags">
                    <span class="admin-tag admin-tag-level">Nv.${level}</span>
                    <span class="admin-tag admin-tag-xp">${xp.toLocaleString()} XP</span>
                    ${groups > 0 ? `<span class="admin-tag admin-tag-social">${groups} groupes</span>` : ''}
                </div>
            </div>
            <div class="admin-user-meta">
                <span class="admin-user-last">${lastStr}</span>
            </div>
        </div>`;
    }).join('');
}

window.filterAdminUsers = function() {
    const query = (document.getElementById('adminUserSearch')?.value || '').toLowerCase();
    const cards = document.querySelectorAll('#adminUserList .admin-user-card');
    cards.forEach(card => {
        const search = card.dataset.search || '';
        card.style.display = search.includes(query) ? '' : 'none';
    });
};

function renderGroupsList(container, docs) {
    if (docs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun groupe</div>';
        return;
    }

    container.innerHTML = docs.map(doc => {
        const d = doc.data();
        const name = d.name || 'Sans nom';
        const emoji = d.emoji || '—';
        const members = d.memberCount || d.members?.length || '?';
        const code = d.code || '—';
        const created = d.createdAt?.toDate?.();
        const createdStr = created ? created.toLocaleDateString('fr-FR') : '—';

        return `<div class="admin-group-card">
            <div class="admin-user-avatar" style="font-size: 1.5rem;">${emoji}</div>
            <div class="admin-user-info">
                <div class="admin-user-name">${escapeHtml(name)}</div>
                <div class="admin-user-tags">
                    <span class="admin-tag admin-tag-social">${members} membres</span>
                    <span class="admin-tag" style="background: rgba(255,255,255,0.04); color: var(--accent-dim);">Code: ${code}</span>
                    <span class="admin-tag" style="background: rgba(255,255,255,0.04); color: var(--accent-dim);">${createdStr}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function renderChallengesList(container) {
    container.innerHTML = '<div class="skeleton-loader" style="height: 60px; border-radius: 12px;"></div>';
    
    if (!cachedGroups || cachedGroups.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun challenge</div>';
        return;
    }

    let html = '';
    for (const g of cachedGroups) {
        const gData = g.data();
        try {
            const chSnap = await g.ref.collection('challenges').get();
            for (const ch of chSnap.docs) {
                const c = ch.data();
                const status = c.status || 'active';
                const statusColor = status === 'active' ? '#2ECC71' : status === 'ended' ? '#E74C3C' : '#F39C12';
                const participants = c.participants?.length || 0;
                html += `<div class="admin-user-card">
                    <div class="admin-user-avatar" style="font-size: 1.2rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                    <div class="admin-user-info">
                        <div class="admin-user-name">${escapeHtml(c.name || 'Challenge')}</div>
                        <div class="admin-user-tags">
                            <span class="admin-tag" style="background: rgba(255,255,255,0.04); color: var(--accent-dim);">${gData.name || 'Groupe'}</span>
                            <span class="admin-tag admin-tag-social">${participants} participants</span>
                            <span class="admin-tag" style="background: rgba(255,255,255,0.04); color: var(--accent-dim);">${c.duration || '?'}j</span>
                        </div>
                    </div>
                    <div class="admin-user-meta">
                        <span class="admin-user-last" style="color:${statusColor}; font-weight: 700;">${status.toUpperCase()}</span>
                    </div>
                </div>`;
            }
        } catch (e) { /* skip */ }
    }

    container.innerHTML = html || '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun challenge</div>';
}

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'en ligne';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
