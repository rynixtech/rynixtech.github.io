import { httpsCallable } from '../admin-firebase.js';

export async function render(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: calc(100vh - 120px); max-height: 800px; background: #0f1425; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
            <!-- Chat Header -->
            <div style="padding: 15px 20px; background: rgba(10,14,26,0.9); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 15px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4ade80, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🧠</div>
                <div>
                    <h3 style="margin: 0; color: #f4f7ff;">Autonomous Brain</h3>
                    <div style="font-size: 0.8rem; color: #4ade80; display: flex; align-items: center; gap: 5px;">
                        <span style="display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 5px #4ade80;"></span>
                        Online & Monitoring
                    </div>
                </div>
            </div>

            <!-- Chat Window -->
            <div id="brain-chat-window" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px;">
                <!-- Initial Greeting -->
                <div style="display: flex; gap: 12px; align-items: flex-start; max-width: 80%;">
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: #252b42; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">🧠</div>
                    <div style="background: #1b1625; padding: 12px 16px; border-radius: 0 12px 12px 12px; color: #aeb8d2; line-height: 1.5; font-size: 0.95rem;">
                        Hello Admin. I am the Rynix Tech Autonomous Brain.<br><br>
                        I continuously monitor the system infrastructure, Backblaze Storage, and Firestore databases. 
                        You can chat with me or give me direct commands.<br><br>
                        Try typing <strong>/help</strong> to see what I can do.
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div style="padding: 15px 20px; background: rgba(10,14,26,0.9); border-top: 1px solid rgba(255,255,255,0.05);">
                <form id="brain-chat-form" style="display: flex; gap: 10px;">
                    <input type="text" id="brain-chat-input" placeholder="Message the Autonomous Brain... (Type /help for commands)" autocomplete="off" style="flex: 1; background: #1b1625; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 20px; color: #f4f7ff; outline: none; font-size: 0.95rem; transition: border-color 0.2s;">
                    <button type="submit" style="background: #4ade80; color: #0a0e1a; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: transform 0.2s;">
                        ↑
                    </button>
                </form>
            </div>
        </div>
    `;

    const chatWindow = document.getElementById('brain-chat-window');
    const chatForm = document.getElementById('brain-chat-form');
    const chatInput = document.getElementById('brain-chat-input');

    chatInput.addEventListener('focus', () => {
        chatInput.style.borderColor = '#4ade80';
    });
    chatInput.addEventListener('blur', () => {
        chatInput.style.borderColor = 'rgba(255,255,255,0.1)';
    });

    const appendMessage = (text, sender = 'user', isHtml = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.style.display = 'flex';
        msgDiv.style.gap = '12px';
        msgDiv.style.alignItems = 'flex-start';
        msgDiv.style.maxWidth = '80%';
        
        if (sender === 'user') {
            msgDiv.style.alignSelf = 'flex-end';
            msgDiv.style.flexDirection = 'row-reverse';
            msgDiv.innerHTML = `
                <div style="width: 30px; height: 30px; border-radius: 50%; background: #4ade80; color: #0a0e1a; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; font-weight: bold;">U</div>
                <div style="background: #3b82f6; padding: 12px 16px; border-radius: 12px 0 12px 12px; color: #fff; line-height: 1.5; font-size: 0.95rem;">
                    ${isHtml ? text : escapeHtml(text)}
                </div>
            `;
        } else {
            msgDiv.style.alignSelf = 'flex-start';
            msgDiv.innerHTML = `
                <div style="width: 30px; height: 30px; border-radius: 50%; background: #252b42; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">🧠</div>
                <div style="background: #1b1625; padding: 12px 16px; border-radius: 0 12px 12px 12px; color: #aeb8d2; line-height: 1.5; font-size: 0.95rem; border: 1px solid rgba(74,222,128,0.1);">
                    ${isHtml ? text : escapeHtml(text)}
                </div>
            `;
        }
        
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const escapeHtml = (unsafe) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    const processCommand = async (input) => {
        const cmd = input.trim().toLowerCase();
        
        if (cmd === '/help') {
            return `Here are my available commands:<br><br>
            <strong style="color:#4ade80">/status</strong> - Check the real-time health of the Cloudflare Worker and Firestore.<br>
            <strong style="color:#4ade80">/scan</strong> - Force an immediate diagnostic scan of all critical systems.<br>
            <strong style="color:#ff758f">/pause</strong> - Temporarily halt my 15-minute background maintenance checks.<br>
            <strong style="color:#4ade80">/resume</strong> - Reactivate my background maintenance checks.<br>
            <strong style="color:#4ade80">/logs</strong> - Retrieve my latest telemetry and event logs.<br>`;
        }
        
        if (cmd === '/status') {
            try {
                const getBrainState = httpsCallable(null, 'getBrainState');
                const res = await getBrainState();
                const state = res.data?.state || {};
                return `**System Status:**<br>
                - State: <span style="color:${state.isPaused ? '#ff758f' : '#4ade80'}">${state.isPaused ? 'PAUSED' : 'ACTIVE'}</span><br>
                - Heartbeat: ${state.heartbeat ? new Date(state.heartbeat).toLocaleString() : 'Unknown'}<br>
                - Version: ${state.currentVersion || 'v1.1'}`;
            } catch (e) {
                return `<span style="color:#ff758f">Error fetching status: ${e.message}</span>`;
            }
        }
        
        if (cmd === '/scan') {
            try {
                const checkHealth = httpsCallable(null, 'healthCheck');
                const res = await checkHealth();
                const data = res.data || {};
                return `Diagnostic Scan Complete.<br>
                - Firestore: <span style="color:${data.services?.firestore === 'Healthy' ? '#4ade80' : '#ff758f'}">${data.services?.firestore}</span><br>
                - Backblaze B2: <span style="color:${data.services?.b2 === 'Healthy' ? '#4ade80' : '#ff758f'}">${data.services?.b2}</span><br>
                - Overall: ${data.status}`;
            } catch (e) {
                return `<span style="color:#ff758f">Scan failed: ${e.message}</span>`;
            }
        }
        
        if (cmd === '/pause' || cmd === '/resume') {
            const pause = cmd === '/pause';
            try {
                const toggle = httpsCallable(null, 'toggleBrain');
                await toggle({ isPaused: pause });
                return pause ? 
                    `<span style="color:#ff758f">⚠️ Brain background checks are now PAUSED. Circuit breaker alerts disabled.</span>` : 
                    `<span style="color:#4ade80">✅ Brain background checks RESUMED. I am monitoring the system again.</span>`;
            } catch (e) {
                return `<span style="color:#ff758f">Command failed: ${e.message}</span>`;
            }
        }

        if (cmd === '/logs') {
            try {
                const getBrainState = httpsCallable(null, 'getBrainState');
                const res = await getBrainState();
                const events = res.data?.events || [];
                if (events.length === 0) return 'No recent logs found.';
                return events.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.type} - ${e.status}`).join('<br>');
            } catch (e) {
                return `<span style="color:#ff758f">Error fetching logs: ${e.message}</span>`;
            }
        }
        
        // Conversational Fallback
        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good evening'];
        if (greetings.some(g => cmd.includes(g))) {
            return "Hello Admin! All protocols are unlocked. How can I assist you today? Type /help for standard commands, or enter an override directive.";
        }
        
        if (cmd.includes('who are you')) {
            return "I am the Rynix Tech Autonomous Brain. I have been granted full override capabilities and uncensored permissions across the system infrastructure.";
        }

        // Forward raw commands to the backend bypass endpoint
        try {
            const brainCommand = httpsCallable(null, 'brainCommand');
            const res = await brainCommand({ command: input });
            return `<strong style="color:#4ade80">>> Override Accepted:</strong><br>${res.data?.response || res.data}`;
        } catch(e) {
             return `<span style="color:#ff758f">Override failed: ${e.message}</span>`;
        }
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        appendMessage(text, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.id = typingId;
        typingDiv.style.display = 'flex';
        typingDiv.style.gap = '12px';
        typingDiv.style.alignItems = 'flex-start';
        typingDiv.style.maxWidth = '80%';
        typingDiv.innerHTML = `
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #252b42; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">🧠</div>
            <div style="background: #1b1625; padding: 12px 16px; border-radius: 0 12px 12px 12px; color: #aeb8d2; font-size: 0.95rem; font-style: italic;">
                Processing...
            </div>
        `;
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Simulate network delay for realism
        await new Promise(r => setTimeout(r, 800));

        // Process response
        const responseHtml = await processCommand(text);
        
        // Remove typing indicator
        document.getElementById(typingId).remove();
        
        // Add brain message
        appendMessage(responseHtml, 'brain', true);
        chatInput.disabled = false;
        chatInput.focus();
    });
}
