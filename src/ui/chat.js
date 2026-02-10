// ============================================================
// CHAT - Messagerie de groupe (texte + audio)
// ============================================================

import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { appState } from '../services/state.js';
import { showPopup } from '../ui/toast.js';

let currentChatGroupId = null;
let chatUnsubscribe = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;
const MAX_RECORDING_SECONDS = 120; // 2 min max

// ============================================================
// RENDER CHAT UI (injected into group detail)
// ============================================================

export function renderChatSection(groupId) {
    return `
        <div class="chat-section">
            <div class="chat-header">
                <span class="chat-header-title">💬 CHAT</span>
                <span class="chat-header-status" id="chatStatus">Connexion...</span>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div class="chat-loading">⏳ Chargement des messages...</div>
            </div>
            <div class="chat-input-area">
                <div class="chat-recording-bar" id="chatRecordingBar" style="display:none;">
                    <div class="chat-recording-dot"></div>
                    <span class="chat-recording-time" id="chatRecordingTime">0:00</span>
                    <button class="chat-cancel-record" onclick="cancelRecording()">✕</button>
                </div>
                <div class="chat-input-row" id="chatInputRow">
                    <button class="chat-mic-btn" id="chatMicBtn" onclick="toggleRecording('${groupId}')">🎙️</button>
                    <input type="text" class="chat-text-input" id="chatTextInput" 
                           placeholder="Message..." maxlength="500"
                           onkeydown="if(event.key==='Enter')sendChatMessage('${groupId}')">
                    <button class="chat-send-btn" id="chatSendBtn" onclick="sendChatMessage('${groupId}')">➤</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// START / STOP LISTENING
// ============================================================

export function startChatListener(groupId) {
    stopChatListener();
    currentChatGroupId = groupId;

    if (!isFirebaseConfigured || !db) return;

    const statusEl = document.getElementById('chatStatus');

    chatUnsubscribe = db.collection('groups').doc(groupId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limitToLast(100)
        .onSnapshot(snapshot => {
            if (statusEl) statusEl.textContent = '🟢 En ligne';
            renderMessages(snapshot.docs);
        }, err => {
            console.error('Chat listener error:', err);
            if (statusEl) statusEl.textContent = '🔴 Hors ligne';
        });
}

export function stopChatListener() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    currentChatGroupId = null;
    cancelRecording();
}

// ============================================================
// RENDER MESSAGES
// ============================================================

function renderMessages(docs) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (docs.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
                <div>Aucun message pour le moment</div>
                <div style="font-size: 0.75rem; margin-top: 4px; color: var(--accent-dim);">Sois le premier à écrire !</div>
            </div>`;
        return;
    }

    const userId = appState.currentUser?.uid;
    let html = '';
    let lastDate = '';

    for (const doc of docs) {
        const msg = doc.data();
        const isMe = msg.senderId === userId;
        const ts = msg.createdAt?.toDate?.() || new Date();

        // Date separator
        const dateStr = ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        if (dateStr !== lastDate) {
            html += `<div class="chat-date-separator"><span>${dateStr}</span></div>`;
            lastDate = dateStr;
        }

        const timeStr = ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        html += `<div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">`;

        if (!isMe) {
            html += `<div class="chat-bubble-sender">
                <span class="chat-bubble-avatar">${escapeHtml(msg.senderAvatar || '👤')}</span>
                <span class="chat-bubble-name">${escapeHtml(msg.senderPseudo || 'Anonyme')}</span>
            </div>`;
        }

        if (msg.type === 'audio' && msg.audioData) {
            html += `<div class="chat-audio-msg">
                <button class="chat-play-btn" onclick="playAudio(this, '${doc.id}')" data-audio="${msg.audioData}">▶️</button>
                <div class="chat-audio-wave">
                    <div class="chat-audio-progress" id="progress-${doc.id}"></div>
                </div>
                <span class="chat-audio-duration">${msg.audioDuration || '0:00'}</span>
            </div>`;
        } else {
            html += `<div class="chat-bubble-text">${escapeHtml(msg.text || '')}</div>`;
        }

        html += `<div class="chat-bubble-time">${timeStr}</div>`;
        html += `</div>`;
    }

    container.innerHTML = html;

    // Scroll to bottom
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

// ============================================================
// SEND TEXT MESSAGE
// ============================================================

export async function sendChatMessage(groupId) {
    const input = document.getElementById('chatTextInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;
    if (!appState.currentUser) return;

    input.value = '';
    input.focus();

    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const userData = userDoc.data() || {};

        await db.collection('groups').doc(groupId).collection('messages').add({
            type: 'text',
            text,
            senderId: appState.currentUser.uid,
            senderPseudo: userData.pseudo || 'Anonyme',
            senderAvatar: userData.avatar || '👤',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Erreur envoi message:', err);
        showPopup('Erreur envoi du message', 'error');
    }
}

// ============================================================
// AUDIO RECORDING
// ============================================================

export async function toggleRecording(groupId) {
    if (isRecording) {
        stopRecording(groupId);
    } else {
        startRecording(groupId);
    }
}

async function startRecording(groupId) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        recordingSeconds = 0;

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'
        });

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());

            if (audioChunks.length === 0) return;

            const blob = new Blob(audioChunks, { type: 'audio/webm' });

            // Convert to base64 for Firestore storage (max ~900KB)
            if (blob.size > 900000) {
                showPopup('Audio trop long, max ~1 min', 'warning');
                return;
            }

            const base64 = await blobToBase64(blob);
            const duration = formatDuration(recordingSeconds);

            try {
                const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
                const userData = userDoc.data() || {};

                await db.collection('groups').doc(groupId).collection('messages').add({
                    type: 'audio',
                    audioData: base64,
                    audioDuration: duration,
                    senderId: appState.currentUser.uid,
                    senderPseudo: userData.pseudo || 'Anonyme',
                    senderAvatar: userData.avatar || '👤',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error('Erreur envoi audio:', err);
                showPopup('Erreur envoi audio', 'error');
            }
        };

        mediaRecorder.start(250); // collect chunks every 250ms
        isRecording = true;

        // UI
        const recordBar = document.getElementById('chatRecordingBar');
        const inputRow = document.getElementById('chatInputRow');
        const micBtn = document.getElementById('chatMicBtn');
        if (recordBar) recordBar.style.display = 'flex';
        if (micBtn) { micBtn.textContent = '⏹️'; micBtn.classList.add('recording'); }

        // Timer
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const timeEl = document.getElementById('chatRecordingTime');
            if (timeEl) timeEl.textContent = formatDuration(recordingSeconds);

            if (recordingSeconds >= MAX_RECORDING_SECONDS) {
                stopRecording(groupId);
            }
        }, 1000);

        // Vibrate
        if (navigator.vibrate) navigator.vibrate(50);

    } catch (err) {
        console.error('Erreur micro:', err);
        showPopup('Accès au micro refusé', 'error');
    }
}

function stopRecording(groupId) {
    if (!isRecording || !mediaRecorder) return;

    isRecording = false;
    clearInterval(recordingTimer);
    mediaRecorder.stop();

    // UI reset
    const recordBar = document.getElementById('chatRecordingBar');
    const micBtn = document.getElementById('chatMicBtn');
    if (recordBar) recordBar.style.display = 'none';
    if (micBtn) { micBtn.textContent = '🎙️'; micBtn.classList.remove('recording'); }

    if (navigator.vibrate) navigator.vibrate(30);
}

export function cancelRecording() {
    if (!isRecording) return;

    isRecording = false;
    clearInterval(recordingTimer);

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        audioChunks = []; // discard
        mediaRecorder.onstop = () => {
            mediaRecorder.stream?.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.stop();
    }

    const recordBar = document.getElementById('chatRecordingBar');
    const micBtn = document.getElementById('chatMicBtn');
    if (recordBar) recordBar.style.display = 'none';
    if (micBtn) { micBtn.textContent = '🎙️'; micBtn.classList.remove('recording'); }
}

// ============================================================
// AUDIO PLAYBACK
// ============================================================

let currentAudio = null;
let currentPlayBtn = null;

export function playAudio(btn, msgId) {
    // Stop current if playing
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        if (currentPlayBtn) currentPlayBtn.textContent = '▶️';
    }

    if (currentPlayBtn === btn) {
        currentPlayBtn = null;
        return; // toggle off
    }

    const base64 = btn.dataset.audio;
    if (!base64) return;

    const audio = new Audio(base64);
    currentAudio = audio;
    currentPlayBtn = btn;
    btn.textContent = '⏸️';

    const progressEl = document.getElementById(`progress-${msgId}`);

    audio.ontimeupdate = () => {
        if (progressEl && audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressEl.style.width = pct + '%';
        }
    };

    audio.onended = () => {
        btn.textContent = '▶️';
        if (progressEl) progressEl.style.width = '0%';
        currentAudio = null;
        currentPlayBtn = null;
    };

    audio.onerror = () => {
        btn.textContent = '▶️';
        showPopup('Erreur lecture audio', 'error');
        currentAudio = null;
        currentPlayBtn = null;
    };

    audio.play().catch(err => {
        console.error('Audio play error:', err);
        btn.textContent = '▶️';
    });
}

// ============================================================
// HELPERS
// ============================================================

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
