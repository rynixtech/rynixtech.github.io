import { aiModel, auth, db } from './firebase.js';

// Inject Chatbot UI into the page
const chatStyles = `
  #rynix-chatbot {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    height: 400px;
    background: #080b18;
    border: 1px solid var(--line);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transform: translateY(120%);
    transition: transform 0.3s ease;
  }
  #rynix-chatbot.open {
    transform: translateY(0);
  }
  #chatbot-header {
    padding: 15px;
    background: rgba(255,255,255,0.05);
    border-bottom: 1px solid var(--line);
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    cursor: pointer;
  }
  #chatbot-messages {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 0.9rem;
  }
  .msg {
    padding: 8px 12px;
    border-radius: 8px;
    max-width: 85%;
    line-height: 1.4;
    white-space: pre-wrap;
  }
  .msg.user {
    background: var(--gold-soft);
    color: #000;
    align-self: flex-end;
  }
  .msg.bot {
    background: rgba(255,255,255,0.1);
    color: var(--text);
    align-self: flex-start;
  }
  #chatbot-input-container {
    display: flex;
    border-top: 1px solid var(--line);
    padding: 10px;
  }
  #chatbot-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    outline: none;
  }
  #chatbot-send {
    background: transparent;
    border: none;
    color: var(--gold);
    cursor: pointer;
    font-weight: 600;
  }
  #chatbot-toggle-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--gold);
    color: #000;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 24px;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = chatStyles;
document.head.appendChild(styleEl);

const toggleBtn = document.createElement('button');
toggleBtn.id = 'chatbot-toggle-btn';
toggleBtn.innerHTML = '💬';
document.body.appendChild(toggleBtn);

const chatContainer = document.createElement('div');
chatContainer.id = 'rynix-chatbot';
chatContainer.innerHTML = `
  <div id="chatbot-header">
    <span>Rynix Brain</span>
    <span id="chatbot-close">✕</span>
  </div>
  <div id="chatbot-messages">
    <div class="msg bot">Hello! I am the Rynix Website Brain. How can I assist you today?</div>
  </div>
  <div id="chatbot-input-container">
    <input type="text" id="chatbot-input" placeholder="Ask me anything..." />
    <button id="chatbot-send">Send</button>
  </div>
`;
document.body.appendChild(chatContainer);

const chatMessages = document.getElementById('chatbot-messages');
const chatInput = document.getElementById('chatbot-input');
const chatSend = document.getElementById('chatbot-send');
const chatClose = document.getElementById('chatbot-close');

toggleBtn.addEventListener('click', () => {
  chatContainer.classList.add('open');
  toggleBtn.style.display = 'none';
});

chatClose.addEventListener('click', () => {
  chatContainer.classList.remove('open');
  toggleBtn.style.display = 'block';
});

let chatSession = null;

async function initChat() {
  chatSession = aiModel.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Hello! I am the Rynix Website Brain. How can I assist you today?' }]
      }
    ]
  });
}
initChat();

async function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  
  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.textContent = text;
  chatMessages.appendChild(userMsg);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add typing indicator
  const botMsg = document.createElement('div');
  botMsg.className = 'msg bot';
  botMsg.textContent = '...';
  chatMessages.appendChild(botMsg);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const result = await chatSession.sendMessage(text);
    botMsg.textContent = await result.response.text();
  } catch (err) {
    console.error('Chat error:', err);
    botMsg.textContent = 'Sorry, there was an error processing your request.';
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSend();
});
