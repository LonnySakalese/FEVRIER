// ============================================================
// CHAT - Messagerie de groupe (texte + audio + réactions + reply + typing)
// ============================================================

import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { appState } from '../services/state.js';
import { showPopup } from '../ui/toast.js';
import { playChatSound } from '../ui/sounds.js';

let currentChatGroupId = null;
let chatUnsubscribe = null;
let typingUnsubscribe = null;
let previousMessageCount = 0;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;
const MAX_RECORDING_SECONDS = 120;

// Audio preview state (recorded but not yet sent)
let pendingAudioBase64 = null;
let pendingAudioDuration = null;
let pendingAudioGroupId = null;

// Typing indicator state
let typingTimeout = null;
let isTyping = false;

// Reply state
let replyingTo = null;

// Scroll state
let userHasScrolledUp = false;
let pendingNewMessages = 0;

// Reaction popup state
let longPressTimer = null;
let activeReactionPopup = null;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ============================================================
// HASH → HSL COLOR for pseudo
// ============================================================

function hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 65%)`;
}

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
            <div class="chat-pinned" id="chatPinnedMessage" style="display:none;" onclick="scrollToPinnedMessage()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                <span class="chat-pinned-text" id="chatPinnedText"></span>
                <button class="chat-pinned-close" id="chatPinnedUnpin" onclick="event.stopPropagation();unpinMessage()" style="display:none;">✕</button>
            </div>
            <div class="chat-messages-wrapper">
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-loading">⏳ Chargement des messages...</div>
                </div>
                <button class="chat-new-messages-btn" id="chatNewMessagesBtn" style="display:none;" onclick="scrollChatToBottom()">
                    ⬇ Nouveaux messages
                </button>
            </div>
            <div class="chat-typing-indicator" id="chatTypingIndicator" style="display:none;">
                <span class="chat-typing-text" id="chatTypingText"></span>
                <span class="chat-typing-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <div class="chat-reply-preview" id="chatReplyPreview" style="display:none;">
                <div class="chat-reply-preview-content">
                    <span class="chat-reply-preview-author" id="chatReplyAuthor"></span>
                    <span class="chat-reply-preview-text" id="chatReplyText"></span>
                </div>
                <button class="chat-reply-preview-close" onclick="cancelReply()">✕</button>
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
                           onkeydown="if(event.key==='Enter')sendChatMessage('${groupId}')"
                           oninput="handleTypingInput('${groupId}'); updateSendBtnState()">
                    <button class="chat-send-btn chat-send-btn-disabled" id="chatSendBtn" onclick="sendChatMessage('${groupId}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
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
    previousMessageCount = 0;
    userHasScrolledUp = false;
    pendingNewMessages = 0;

    // Mark messages as read
    markGroupAsRead(groupId);

    // Load pinned message
    loadPinnedMessage(groupId);

    // Update lastSeen for online presence
    if (appState.currentUser) {
        db.collection('groups').doc(groupId).collection('members').doc(appState.currentUser.uid).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
        // Update lastSeen every 60s while chat is open
        if (window._lastSeenInterval) clearInterval(window._lastSeenInterval);
        window._lastSeenInterval = setInterval(() => {
            if (currentChatGroupId && appState.currentUser) {
                db.collection('groups').doc(currentChatGroupId).collection('members').doc(appState.currentUser.uid).update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(() => {});
            }
        }, 60000);
    }

    // Setup scroll detection
    setTimeout(() => {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.addEventListener('scroll', () => {
                const threshold = 60;
                userHasScrolledUp = (container.scrollHeight - container.scrollTop - container.clientHeight) > threshold;
                if (!userHasScrolledUp) {
                    pendingNewMessages = 0;
                    const btn = document.getElementById('chatNewMessagesBtn');
                    if (btn) btn.style.display = 'none';
                }
            });
        }
    }, 500);

    // Messages listener
    chatUnsubscribe = db.collection('groups').doc(groupId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limitToLast(100)
        .onSnapshot(snapshot => {
            if (statusEl) statusEl.textContent = '🟢 En ligne';

            const newCount = snapshot.docs.length;
            if (previousMessageCount > 0 && newCount > previousMessageCount) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                const lastMsg = lastDoc?.data();
                if (lastMsg && lastMsg.senderId !== appState.currentUser?.uid) {
                    playChatSound();
                    if (userHasScrolledUp) {
                        pendingNewMessages += (newCount - previousMessageCount);
                        const btn = document.getElementById('chatNewMessagesBtn');
                        if (btn) {
                            btn.style.display = 'flex';
                            btn.textContent = `⬇ ${pendingNewMessages} nouveau${pendingNewMessages > 1 ? 'x' : ''} message${pendingNewMessages > 1 ? 's' : ''}`;
                        }
                    }
                }
            }
            previousMessageCount = newCount;

            renderMessages(snapshot.docs);

            // Update last read
            if (snapshot.docs.length > 0) {
                const lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
                if (!userHasScrolledUp) {
                    localStorage.setItem(`lastReadMessage_${groupId}`, lastDocId);
                    localStorage.setItem(`lastReadTimestamp_${groupId}`, Date.now().toString());
                }
            }
        }, err => {
            console.error('Chat listener error:', err);
            if (statusEl) statusEl.textContent = '🔴 Hors ligne';
        });

    // Typing listener
    startTypingListener(groupId);
}

export function stopChatListener() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    if (typingUnsubscribe) {
        typingUnsubscribe();
        typingUnsubscribe = null;
    }
    // Clean typing state
    if (currentChatGroupId && isTyping) {
        clearTypingIndicator(currentChatGroupId);
    }
    currentChatGroupId = null;
    replyingTo = null;
    cancelRecording();
    if (window._lastSeenInterval) {
        clearInterval(window._lastSeenInterval);
        window._lastSeenInterval = null;
    }
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
    let lastSenderId = null;
    let lastSenderType = null; // track system vs user

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const msg = doc.data();
        const msgId = doc.id;
        const isMe = msg.senderId === userId;
        const ts = msg.createdAt?.toDate?.() || new Date();

        // Date separator
        const dateStr = ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        if (dateStr !== lastDate) {
            html += `<div class="chat-date-separator"><span>${dateStr}</span></div>`;
            lastDate = dateStr;
            lastSenderId = null;
        }

        const timeStr = ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // Message système
        if (msg.type === 'system') {
            html += `<div class="chat-bubble chat-bubble-system">`;
            html += `<div class="chat-bubble-text">${escapeHtml(msg.text || '')}</div>`;
            html += `<div class="chat-bubble-time">${timeStr}</div>`;
            html += `</div>`;
            lastSenderId = null;
            lastSenderType = 'system';
            continue;
        }

        // Grouping: check if same sender as previous
        const isGrouped = lastSenderId === msg.senderId && lastSenderType !== 'system';
        const isFirstInGroup = !isGrouped;

        // Look ahead: is next msg same sender?
        let isLastInGroup = true;
        if (i + 1 < docs.length) {
            const nextMsg = docs[i + 1].data();
            if (nextMsg.senderId === msg.senderId && nextMsg.type !== 'system') {
                const nextTs = nextMsg.createdAt?.toDate?.() || new Date();
                const nextDateStr = nextTs.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                if (nextDateStr === dateStr) {
                    isLastInGroup = false;
                }
            }
        }

        // Bubble class modifiers for iMessage-style grouping
        let groupClass = '';
        if (isFirstInGroup && isLastInGroup) groupClass = 'chat-bubble-single';
        else if (isFirstInGroup) groupClass = 'chat-bubble-first';
        else if (isLastInGroup) groupClass = 'chat-bubble-last';
        else groupClass = 'chat-bubble-middle';

        const senderColor = !isMe ? hashStringToColor(msg.senderId || 'anon') : '';

        html += `<div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'} ${groupClass}" 
                      data-msg-id="${msgId}"
                      ontouchstart="handleBubbleTouchStart(event, '${msgId}')"
                      ontouchend="handleBubbleTouchEnd(event)"
                      ontouchmove="handleBubbleTouchMove(event)"
                      ondblclick="showReactionPopup(event, '${msgId}')">`;

        // Reply preview
        if (msg.replyTo) {
            html += `<div class="chat-reply-quote" onclick="scrollToMessage('${escapeHtml(msg.replyTo.messageId || '')}')">
                <span class="chat-reply-quote-author">${escapeHtml(msg.replyTo.senderPseudo || 'Anonyme')}</span>
                <span class="chat-reply-quote-text">${escapeHtml(truncate(msg.replyTo.text || '', 80))}</span>
            </div>`;
        }

        if (msg.type === 'audio' && msg.audioData) {
            html += `<div class="chat-audio-msg">
                <button class="chat-play-btn" onclick="playAudio(this, '${msgId}')" data-audio="${msg.audioData}">▶️</button>
                <div class="chat-audio-wave">
                    <div class="chat-audio-progress" id="progress-${msgId}"></div>
                </div>
                <span class="chat-audio-duration">${msg.audioDuration || '0:00'}</span>
            </div>`;
        } else {
            html += `<div class="chat-bubble-text">${escapeHtml(msg.text || '')}</div>`;
        }

        // Reactions display
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            html += `<div class="chat-reactions">`;
            for (const [emoji, users] of Object.entries(msg.reactions)) {
                if (!users || users.length === 0) continue;
                const iReacted = users.includes(userId);
                html += `<button class="chat-reaction-badge ${iReacted ? 'chat-reaction-mine' : ''}" 
                                 onclick="toggleReaction('${msgId}', '${emoji}')">
                    ${emoji} <span class="chat-reaction-count">${users.length}</span>
                </button>`;
            }
            html += `</div>`;
        }

        // "..." menu button (replaces hover actions)
        const msgTextForAttr = escapeAttr(msg.text || (msg.type === 'audio' ? '🎵 Audio' : ''));
        const senderForAttr = escapeAttr(msg.senderPseudo || 'Anonyme');
        html += `<button class="chat-msg-more-btn" onclick="toggleMsgMenu(event, '${msgId}', '${senderForAttr}', '${msgTextForAttr}', ${isMe})">⋯</button>`;
        html += `<div class="chat-msg-menu" id="msgMenu-${msgId}" style="display:none;">
            <button onclick="setReplyTo('${msgId}', '${senderForAttr}', '${msgTextForAttr}'); closeMsgMenus()">↩ Répondre</button>
            ${isMe ? `<button onclick="pinMessage('${msgId}', '${msgTextForAttr}'); closeMsgMenus()">📌 Épingler</button>` : ''}
        </div>`;

        // Sender pseudo at bottom (not me, last in group)
        if (!isMe && isLastInGroup) {
            html += `<div class="chat-bubble-sender-bottom">
                <span class="chat-bubble-avatar">${escapeHtml(msg.senderAvatar || '👤')}</span>
                <span class="chat-bubble-name" style="color: ${senderColor}">${escapeHtml(msg.senderPseudo || 'Anonyme')}</span>
            </div>`;
        }

        html += `<div class="chat-bubble-time">${timeStr}</div>`;
        html += `</div>`;

        lastSenderId = msg.senderId;
        lastSenderType = 'user';
    }

    // Reaction popup container (reusable, placed outside bubbles)
    html += `<div class="chat-reaction-popup" id="chatReactionPopup" style="display:none;">
        ${QUICK_REACTIONS.map(e => `<button class="chat-reaction-option" onclick="selectReaction('${e}')">${e}</button>`).join('')}
    </div>`;

    const wasAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 60;
    container.innerHTML = html;

    if (wasAtBottom || !userHasScrolledUp) {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
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

    // Clear typing indicator
    clearTypingIndicator(groupId);

    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const userData = userDoc.data() || {};

        const messageData = {
            type: 'text',
            text,
            senderId: appState.currentUser.uid,
            senderPseudo: userData.pseudo || 'Anonyme',
            senderAvatar: userData.avatar || '👤',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Include reply data if replying
        if (replyingTo) {
            messageData.replyTo = {
                messageId: replyingTo.messageId,
                senderPseudo: replyingTo.senderPseudo,
                text: replyingTo.text
            };
            cancelReply();
        }

        await db.collection('groups').doc(groupId).collection('messages').add(messageData);
    } catch (err) {
        console.error('Erreur envoi message:', err);
        showPopup('Erreur envoi du message', 'error');
    }
}

// ============================================================
// TYPING INDICATOR
// ============================================================

export function handleTypingInput(groupId) {
    if (!isFirebaseConfigured || !db || !appState.currentUser) return;

    if (!isTyping) {
        isTyping = true;
        setTypingIndicator(groupId);
    }

    // Reset debounce
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        clearTypingIndicator(groupId);
    }, 2000);
}

function setTypingIndicator(groupId) {
    if (!db || !appState.currentUser) return;
    const userId = appState.currentUser.uid;

    db.collection('users').doc(userId).get().then(userDoc => {
        const userData = userDoc.data() || {};
        db.collection('groups').doc(groupId).collection('typing').doc(userId).set({
            pseudo: userData.pseudo || 'Anonyme',
            avatar: userData.avatar || '👤',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }).catch(() => {});
}

function clearTypingIndicator(groupId) {
    isTyping = false;
    clearTimeout(typingTimeout);
    if (!db || !appState.currentUser) return;
    const userId = appState.currentUser.uid;
    db.collection('groups').doc(groupId).collection('typing').doc(userId).delete().catch(() => {});
}

function startTypingListener(groupId) {
    if (!db) return;

    typingUnsubscribe = db.collection('groups').doc(groupId)
        .collection('typing')
        .onSnapshot(snapshot => {
            const userId = appState.currentUser?.uid;
            const now = Date.now();
            const typers = [];

            snapshot.docs.forEach(doc => {
                if (doc.id === userId) return; // skip self
                const data = doc.data();
                const ts = data.timestamp?.toDate?.()?.getTime() || 0;
                // Only show if < 5 seconds old
                if (now - ts < 5000) {
                    typers.push(data.pseudo || 'Quelqu\'un');
                } else {
                    // Clean old entries
                    doc.ref.delete().catch(() => {});
                }
            });

            const indicator = document.getElementById('chatTypingIndicator');
            const textEl = document.getElementById('chatTypingText');
            if (indicator && textEl) {
                if (typers.length > 0) {
                    const names = typers.length <= 2 ? typers.join(' et ') : `${typers.length} personnes`;
                    textEl.textContent = `${names} ${typers.length > 1 ? 'écrivent' : 'écrit'}`;
                    indicator.style.display = 'flex';
                } else {
                    indicator.style.display = 'none';
                }
            }
        }, () => {});
}

// ============================================================
// REACTIONS
// ============================================================

let reactionTargetMsgId = null;

export function showReactionPopup(event, msgId) {
    event.preventDefault();
    event.stopPropagation();
    reactionTargetMsgId = msgId;

    const popup = document.getElementById('chatReactionPopup');
    if (!popup) return;

    // Position near the bubble
    const bubble = event.currentTarget || event.target.closest('.chat-bubble');
    if (!bubble) return;

    const container = document.getElementById('chatMessages');
    if (!container) return;

    const bubbleRect = bubble.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    popup.style.display = 'flex';
    popup.style.top = (bubbleRect.top - containerRect.top - 45) + 'px';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';

    activeReactionPopup = popup;

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', closeReactionPopup, { once: true });
    }, 10);
}

function closeReactionPopup() {
    const popup = document.getElementById('chatReactionPopup');
    if (popup) popup.style.display = 'none';
    activeReactionPopup = null;
    reactionTargetMsgId = null;
}

export function selectReaction(emoji) {
    if (!reactionTargetMsgId) return;
    toggleReaction(reactionTargetMsgId, emoji);
    closeReactionPopup();
}

export async function toggleReaction(msgId, emoji) {
    if (!currentChatGroupId || !appState.currentUser || !db) return;

    const userId = appState.currentUser.uid;
    const msgRef = db.collection('groups').doc(currentChatGroupId).collection('messages').doc(msgId);

    try {
        const msgDoc = await msgRef.get();
        if (!msgDoc.exists) return;

        const data = msgDoc.data();
        const reactions = data.reactions || {};
        const users = reactions[emoji] || [];

        if (users.includes(userId)) {
            // Remove
            await msgRef.update({
                [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayRemove(userId)
            });
        } else {
            // Add
            await msgRef.update({
                [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayUnion(userId)
            });
        }
    } catch (err) {
        console.error('Erreur réaction:', err);
    }
}

// Long press handlers for touch
export function handleBubbleTouchStart(event, msgId) {
    longPressTimer = setTimeout(() => {
        showReactionPopup(event, msgId);
    }, 500);
}

export function handleBubbleTouchEnd(event) {
    clearTimeout(longPressTimer);
}

export function handleBubbleTouchMove(event) {
    clearTimeout(longPressTimer);
}

// ============================================================
// REPLY
// ============================================================

export function setReplyTo(msgId, senderPseudo, text) {
    replyingTo = { messageId: msgId, senderPseudo, text };

    const preview = document.getElementById('chatReplyPreview');
    const authorEl = document.getElementById('chatReplyAuthor');
    const textEl = document.getElementById('chatReplyText');

    if (preview && authorEl && textEl) {
        authorEl.textContent = senderPseudo;
        textEl.textContent = truncate(text, 60);
        preview.style.display = 'flex';
    }

    const input = document.getElementById('chatTextInput');
    if (input) input.focus();
}

export function cancelReply() {
    replyingTo = null;
    const preview = document.getElementById('chatReplyPreview');
    if (preview) preview.style.display = 'none';
}

export function scrollToMessage(msgId) {
    if (!msgId) return;
    const el = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('chat-bubble-highlight');
        setTimeout(() => el.classList.remove('chat-bubble-highlight'), 1500);
    }
}

// ============================================================
// SCROLL TO BOTTOM (new messages button)
// ============================================================

export function scrollChatToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
    pendingNewMessages = 0;
    userHasScrolledUp = false;
    const btn = document.getElementById('chatNewMessagesBtn');
    if (btn) btn.style.display = 'none';
}

// ============================================================
// UNREAD BADGE SYSTEM
// ============================================================

function markGroupAsRead(groupId) {
    // Will be called when opening chat, actual last msg stored in listener
    localStorage.setItem(`lastReadTimestamp_${groupId}`, Date.now().toString());
}

export async function getUnreadCount(groupId) {
    if (!db || !isFirebaseConfigured) return 0;

    const lastReadTimestamp = parseInt(localStorage.getItem(`lastReadTimestamp_${groupId}`) || '0');
    if (!lastReadTimestamp) return 0;

    try {
        const lastReadDate = new Date(lastReadTimestamp);
        const snap = await db.collection('groups').doc(groupId)
            .collection('messages')
            .where('createdAt', '>', lastReadDate)
            .get();

        // Filter out own messages
        const userId = appState.currentUser?.uid;
        const unread = snap.docs.filter(d => d.data().senderId !== userId);
        return unread.length;
    } catch (e) {
        return 0;
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

            if (blob.size > 900000) {
                showPopup('Audio trop long, max ~1 min', 'warning');
                return;
            }

            const base64 = await blobToBase64(blob);
            const duration = formatDuration(recordingSeconds);

            // Don't auto-send — show preview instead
            pendingAudioBase64 = base64;
            pendingAudioDuration = duration;
            pendingAudioGroupId = groupId;
            showAudioPreview(duration);
        };

        mediaRecorder.start(250);
        isRecording = true;

        const recordBar = document.getElementById('chatRecordingBar');
        const micBtn = document.getElementById('chatMicBtn');
        if (recordBar) recordBar.style.display = 'flex';
        if (micBtn) { micBtn.textContent = '⏹️'; micBtn.classList.add('recording'); }

        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const timeEl = document.getElementById('chatRecordingTime');
            if (timeEl) timeEl.textContent = formatDuration(recordingSeconds);

            if (recordingSeconds >= MAX_RECORDING_SECONDS) {
                stopRecording(groupId);
            }
        }, 1000);

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

    const recordBar = document.getElementById('chatRecordingBar');
    const micBtn = document.getElementById('chatMicBtn');
    if (recordBar) recordBar.style.display = 'none';
    if (micBtn) { micBtn.textContent = '🎙️'; micBtn.classList.remove('recording'); }

    if (navigator.vibrate) navigator.vibrate(30);
}

export function cancelRecording() {
    if (isRecording) {
        isRecording = false;
        clearInterval(recordingTimer);

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            audioChunks = [];
            mediaRecorder.onstop = () => {
                mediaRecorder.stream?.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.stop();
        }
    }

    // Also clear any pending audio preview
    clearAudioPreview();

    const recordBar = document.getElementById('chatRecordingBar');
    const micBtn = document.getElementById('chatMicBtn');
    if (recordBar) recordBar.style.display = 'none';
    if (micBtn) { micBtn.textContent = '🎙️'; micBtn.classList.remove('recording'); }
}

function showAudioPreview(duration) {
    const inputRow = document.getElementById('chatInputRow');
    if (!inputRow) return;
    
    // Hide normal input, show audio preview
    inputRow.innerHTML = `
        <div class="chat-audio-preview">
            <button class="chat-audio-preview-delete" onclick="cancelRecording()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="chat-audio-preview-wave">
                <span class="chat-audio-preview-icon">🎙️</span>
                <span class="chat-audio-preview-duration">${duration}</span>
            </div>
            <button class="chat-audio-preview-send" onclick="sendPendingAudio()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>
    `;
}

function clearAudioPreview() {
    pendingAudioBase64 = null;
    pendingAudioDuration = null;
    pendingAudioGroupId = null;
    restoreChatInputRow();
}

function restoreChatInputRow() {
    const inputRow = document.getElementById('chatInputRow');
    if (!inputRow || !currentChatGroupId) return;
    
    inputRow.innerHTML = `
        <button class="chat-mic-btn" id="chatMicBtn" onclick="toggleRecording('${currentChatGroupId}')">🎙️</button>
        <input type="text" class="chat-text-input" id="chatTextInput" 
               placeholder="Message..." maxlength="500"
               onkeydown="if(event.key==='Enter')sendChatMessage('${currentChatGroupId}')"
               oninput="handleTypingInput('${currentChatGroupId}'); updateSendBtnState()">
        <button class="chat-send-btn chat-send-btn-disabled" id="chatSendBtn" onclick="sendChatMessage('${currentChatGroupId}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
    `;
}

export async function sendPendingAudio() {
    if (!pendingAudioBase64 || !pendingAudioGroupId || !appState.currentUser) return;
    
    const groupId = pendingAudioGroupId;
    const base64 = pendingAudioBase64;
    const duration = pendingAudioDuration;
    
    clearAudioPreview();
    
    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const userData = userDoc.data() || {};

        const messageData = {
            type: 'audio',
            audioData: base64,
            audioDuration: duration,
            senderId: appState.currentUser.uid,
            senderPseudo: userData.pseudo || 'Anonyme',
            senderAvatar: userData.avatar || '👤',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (replyingTo) {
            messageData.replyTo = {
                messageId: replyingTo.messageId,
                senderPseudo: replyingTo.senderPseudo,
                text: replyingTo.text
            };
            cancelReply();
        }

        await db.collection('groups').doc(groupId).collection('messages').add(messageData);
    } catch (err) {
        console.error('Erreur envoi audio:', err);
        showPopup('Erreur envoi audio', 'error');
    }
}

// ============================================================
// AUDIO PLAYBACK
// ============================================================

let currentAudio = null;
let currentPlayBtn = null;

export function playAudio(btn, msgId) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        if (currentPlayBtn) currentPlayBtn.textContent = '▶️';
    }

    if (currentPlayBtn === btn) {
        currentPlayBtn = null;
        return;
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

function escapeAttr(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
}

// ============================================================
// PIN MESSAGE
// ============================================================

export async function pinMessage(msgId, text) {
    if (!currentChatGroupId) return;
    try {
        await db.collection('groups').doc(currentChatGroupId).update({
            pinnedMessage: { msgId, text: text.substring(0, 100) }
        });
        showPopup('📌 Message épinglé !', 'success');
        loadPinnedMessage(currentChatGroupId);
    } catch (e) {
        console.error('Erreur pin:', e);
        showPopup('Erreur', 'error');
    }
}

export async function unpinMessage() {
    if (!currentChatGroupId) return;
    try {
        await db.collection('groups').doc(currentChatGroupId).update({
            pinnedMessage: firebase.firestore.FieldValue.delete()
        });
        const el = document.getElementById('chatPinnedMessage');
        if (el) el.style.display = 'none';
        showPopup('Message désépinglé', 'info');
    } catch (e) {
        console.error('Erreur unpin:', e);
    }
}

export async function loadPinnedMessage(groupId) {
    try {
        const gDoc = await db.collection('groups').doc(groupId).get();
        const data = gDoc.data();
        const el = document.getElementById('chatPinnedMessage');
        const textEl = document.getElementById('chatPinnedText');
        const unpinBtn = document.getElementById('chatPinnedUnpin');
        if (!el || !textEl) return;

        if (data?.pinnedMessage) {
            textEl.textContent = data.pinnedMessage.text;
            el.style.display = 'flex';
            // Show unpin button if user is creator
            if (unpinBtn && data.creatorId === appState.currentUser?.uid) {
                unpinBtn.style.display = 'block';
            }
        } else {
            el.style.display = 'none';
        }
    } catch (e) { /* ignore */ }
}

export function scrollToPinnedMessage() {
    // Scroll to the actual pinned message
    if (!currentChatGroupId || !db) {
        const container = document.getElementById('chatMessages');
        if (container) container.scrollTop = 0;
        return;
    }
    
    db.collection('groups').doc(currentChatGroupId).get().then(gDoc => {
        const data = gDoc.data();
        if (data?.pinnedMessage?.msgId) {
            scrollToMessage(data.pinnedMessage.msgId);
        }
    }).catch(() => {});
}

// ============================================================
// MESSAGE MENU (replaces hover actions)
// ============================================================

export function toggleMsgMenu(event, msgId, sender, text, isMe) {
    event.stopPropagation();
    
    // Close any open menus first
    closeMsgMenus();
    
    const menu = document.getElementById(`msgMenu-${msgId}`);
    if (menu) {
        menu.style.display = 'flex';
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeMsgMenus, { once: true });
        }, 10);
    }
}

export function closeMsgMenus() {
    document.querySelectorAll('.chat-msg-menu').forEach(m => m.style.display = 'none');
}

// ============================================================
// SEND BUTTON STATE
// ============================================================

export function updateSendBtnState() {
    const input = document.getElementById('chatTextInput');
    const btn = document.getElementById('chatSendBtn');
    if (!input || !btn) return;
    
    if (input.value.trim().length > 0) {
        btn.classList.add('chat-send-btn-active');
        btn.classList.remove('chat-send-btn-disabled');
    } else {
        btn.classList.remove('chat-send-btn-active');
        btn.classList.add('chat-send-btn-disabled');
    }
}

// ============================================================
// GROUP GOAL / OBJECTIVE
// ============================================================

export function renderGroupGoal(groupId, groupData) {
    const goalEl = document.getElementById('groupGoalSection');
    if (!goalEl) return '';

    if (groupData?.goal) {
        const progress = groupData.goal.progress || 0;
        return `
            <div class="group-goal">
                <div class="group-goal-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB84D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    <span class="group-goal-title">Objectif du groupe</span>
                </div>
                <div class="group-goal-text">${groupData.goal.text}</div>
                <div class="group-goal-bar">
                    <div class="group-goal-bar-fill" style="width: ${progress}%"></div>
                </div>
                <div class="group-goal-progress">${progress}%</div>
            </div>`;
    }
    return '';
}

// ============================================================
// UPDATE NAV BADGE
// ============================================================

export async function updateGroupsNavBadge() {
    if (!isFirebaseConfigured || !appState.currentUser) return;
    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const groupIds = userDoc.data()?.groups || [];
        let totalUnread = 0;
        for (const gId of groupIds) {
            try {
                const count = await getUnreadCount(gId);
                totalUnread += count;
            } catch (e) { /* ignore */ }
        }
        const badge = document.getElementById('navGroupsBadge');
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { /* ignore */ }
}
