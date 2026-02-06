// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8hT35rl_8uO27LoBSAWjU89wRtF4TxL4",
  authDomain: "unsent-c49a2.firebaseapp.com",
  projectId: "unsent-c49a2",
  storageBucket: "unsent-c49a2.firebasestorage.app",
  messagingSenderId: "736167237909",
  appId: "1:736167237909:web:3792aaa732ebae0430311c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase initialized successfully');

// Character counter
const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');

messageInput.addEventListener('input', () => {
  charCount.textContent = messageInput.value.length;
});

// Screen switching
window.switchScreen = function(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// Storage functions using Firebase Firestore
window.submitMessage = async function() {
  const message = messageInput.value.trim();
  
  if (!message) {
    showSuccess('not ready to send?', false);
    return;
  }

  try {
    // Get location
    let location = 'somewhere in the world';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });
      
      const lat = position.coords.latitude.toFixed(4);
      const lon = position.coords.longitude.toFixed(4);
      location = `${lat}, ${lon}`;
      
    } catch (geoError) {
      console.log('Location not available:', geoError);
    }
    
    const messageData = {
      text: message,
      timestamp: Date.now(),
      location: location
    };

    // Save to Firebase
    await addDoc(collection(db, 'messages'), messageData);
    
    // Clear input
    messageInput.value = '';
    charCount.textContent = '0';
    
    // Show success message
    showSuccess('your message has been released into the void...', true);
    
    // Wait a bit then switch to collection
    setTimeout(() => {
      switchScreen('collection-screen');
      loadMessages();
    }, 2000);

  } catch (error) {
    console.error('Failed to submit message:', error);
    showSuccess('failed to send message. please try again.', false);
  }
}

function showSuccess(message, isSuccess) {
  const container = document.getElementById('success-container');
  container.innerHTML = `<div class="success-message" style="${isSuccess ? '' : 'background: #8B7355; color: var(--white);'}">${message}</div>`;
  
  setTimeout(() => {
    container.innerHTML = '';
  }, 3000);
}

window.loadMessages = async function() {
  const container = document.getElementById('messages-container');
  container.innerHTML = '<div class="empty-state">loading messages...</div>';

  try {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - oneWeek;

    // Get messages from last 7 days
    const q = query(
      collection(db, 'messages'),
      where('timestamp', '>', oneWeekAgo),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      container.innerHTML = '<div class="empty-state">no messages yet. be the first to share something unsent...</div>';
      return;
    }

    const messages = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      data.age = now - data.timestamp;
      messages.push(data);
    });

    // Display messages
    container.innerHTML = '';
    messages.forEach(msg => {
      const card = createMessageCard(msg);
      container.appendChild(card);
    });

    // Clean up old messages
    const oldQuery = query(
      collection(db, 'messages'),
      where('timestamp', '<', oneWeekAgo)
    );
    
    const oldSnapshot = await getDocs(oldQuery);
    oldSnapshot.forEach((docSnap) => {
      deleteDoc(doc(db, 'messages', docSnap.id));
    });

  } catch (error) {
    console.error('Failed to load messages:', error);
    container.innerHTML = '<div class="empty-state">failed to load messages. please try again.</div>';
  }
}

function createMessageCard(msgData) {
  const card = document.createElement('div');
  card.className = 'message-card';
  
  // Calculate fading level (1-7 based on days)
  const oneDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor(msgData.age / oneDay);
  const fadingLevel = Math.min(daysPassed + 1, 7);
  card.classList.add(`fading-${fadingLevel}`);
  
  // Calculate time remaining
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const timeRemaining = oneWeek - msgData.age;
  const daysRemaining = Math.ceil(timeRemaining / oneDay);
  
  // Truncate text for preview
  const preview = msgData.text.length > 150 
    ? msgData.text.substring(0, 150) + '...' 
    : msgData.text;
  
  card.innerHTML = `
    <div class="message-text">${escapeHtml(preview)}</div>
    <div class="message-meta">
      <span>${getTimeAgo(msgData.timestamp)}</span>
    </div>
  `;
  
  card.onclick = () => openMessageModal(msgData, daysRemaining);
  
  return card;
}

function openMessageModal(msgData, daysRemaining) {
  const modal = document.getElementById('message-modal');
  const messageDiv = document.getElementById('modal-message');
  const metaDiv = document.getElementById('modal-meta');
  
  messageDiv.textContent = msgData.text;
  
  // Format the timestamp
  const date = new Date(msgData.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const locationText = msgData.location || 'somewhere in the world';
  
  metaDiv.innerHTML = `
    <div>${formattedTime}, ${formattedDate}</div>
    <div style="margin-top: 8px;">from ${locationText}</div>
  `;
  
  modal.classList.add('active');
}

window.closeModal = function(event) {
  const modal = document.getElementById('message-modal');
  modal.classList.remove('active');
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'just now';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-refresh collection every 30 seconds when viewing
let refreshInterval;

// Set up observer to start/stop refresh based on active screen
const observer = new MutationObserver(() => {
  const collectionScreen = document.getElementById('collection-screen');
  if (collectionScreen.classList.contains('active')) {
    if (!refreshInterval) {
      refreshInterval = setInterval(() => {
        loadMessages();
      }, 30000);
    }
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
});

observer.observe(document.getElementById('collection-screen'), {
  attributes: true,
  attributeFilter: ['class']
});
