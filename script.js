// 캐릭터 카운터
const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');

messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length;
});

// 화면 전환
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 메시지 전송 (저장)
async function submitMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        showSuccess('not ready to send?', false);
        return;
    }

    try {
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        let location = 'somewhere in the world';

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    enableHighAccuracy: false
                });
            });
            location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        } catch (geoError) {
            console.log('Location not available');
        }
        
        const messageData = {
            text: message,
            timestamp: Date.now(),
            id: messageId,
            location: location
        };

        // 로컬 스토리지를 기본으로 사용 (window.storage가 없을 경우 대비)
        const storageProvider = window.storage || {
            set: async (k, v) => localStorage.setItem(k, v),
            list: async (prefix) => ({ keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }),
            get: async (k) => ({ value: localStorage.getItem(k) }),
            delete: async (k) => localStorage.removeItem(k)
        };

        await storageProvider.set(messageId, JSON.stringify(messageData));
        
        messageInput.value = '';
        charCount.textContent = '0';
        showSuccess('your message has been released into the void...', true);
        
        setTimeout(() => {
            switchScreen('collection-screen');
            loadMessages();
        }, 2000);

    } catch (error) {
        console.error('Submission failed:', error);
        showSuccess('failed to send message.', false);
    }
}

function showSuccess(message, isSuccess) {
    const container = document.getElementById('success-container');
    const colorStyle = isSuccess ? '' : 'background: #8B7355; color: white;';
    container.innerHTML = `<div class="success-message" style="${colorStyle}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}

// 메시지 불러오기
async function loadMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '<div class="empty-state">loading messages...</div>';

    const storageProvider = window.storage || {
        list: async (prefix) => ({ keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }),
        get: async (k) => ({ value: localStorage.getItem(k) }),
        delete: async (k) => localStorage.removeItem(k)
    };

    try {
        const result = await storageProvider.list('msg_');
        if (!result.keys || result.keys.length === 0) {
            container.innerHTML = '<div class="empty-state">no messages yet.</div>';
            return;
        }

        const messages = [];
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        for (const key of result.keys) {
            const msgResult = await storageProvider.get(key);
            if (msgResult.value) {
                const msgData = JSON.parse(msgResult.value);
                const age = now - msgData.timestamp;
                
                if (age > oneWeek) {
                    await storageProvider.delete(key);
                } else {
                    msgData.age = age;
                    messages.push(msgData);
                }
            }
        }

        messages.sort((a, b) => b.timestamp - a.timestamp);
        container.innerHTML = '';
        messages.forEach(msg => {
            const card = createMessageCard(msg);
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<div class="empty-state">failed to load messages.</div>';
    }
}

function createMessageCard(msgData) {
    const card = document.createElement('div');
    card.className = 'message-card';
    
    const oneDay = 24 * 60 * 60 * 1000;
    const fadingLevel = Math.min(Math.floor(msgData.age / oneDay) + 1, 7);
    card.classList.add(`fading-${fadingLevel}`);
    
    const preview = msgData.text.length > 150 ? msgData.text.substring(0, 150) + '...' : msgData.text;
    
    card.innerHTML = `
        <div class="message-text">${escapeHtml(preview)}</div>
        <div class="message-meta"><span>${getTimeAgo(msgData.timestamp)}</span></div>
    `;
    card.onclick = () => openMessageModal(msgData);
    return card;
}

function openMessageModal(msgData) {
    const modal = document.getElementById('message-modal');
    document.getElementById('modal-message').textContent = msgData.text;
    const date = new Date(msgData.timestamp);
    document.getElementById('modal-meta').innerHTML = `
        <div>${date.toLocaleString()}</div>
        <div style="margin-top: 8px;">from ${msgData.location}</div>
    `;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('message-modal').classList.remove('active');
}

function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    return `${mins || 0}m ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
