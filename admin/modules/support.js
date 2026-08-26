import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Customer Support</h2>
        </div>
        <div class="table-container" style="background: rgba(11, 16, 35, 0.82); border-radius: 12px; border: 1px solid var(--line); overflow-x: auto;">
            <table id="support-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.02);">
                        <th style="padding: 12px 16px;">Date</th>
                        <th style="padding: 12px 16px;">Name</th>
                        <th style="padding: 12px 16px;">Email</th>
                        <th style="padding: 12px 16px;">Subject</th>
                        <th style="padding: 12px 16px;">Status</th>
                        <th style="padding: 12px 16px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="support-tbody"></tbody>
            </table>
        </div>

        <div id="support-modal" class="modal" style="display:none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
            <div class="modal-content" style="background: #0f1425; padding: 30px; border-radius: 12px; width: 600px; max-width: 90%; border: 1px solid var(--line);">
                <h3 style="margin-top: 0; color: var(--gold-soft);">Support Request</h3>
                <div id="support-details" style="color: #f4f7ff; line-height: 1.6; margin-bottom: 20px;"></div>
                <div style="display: flex; justify-content: space-between;">
                    <a id="reply-mailto" href="#" class="btn" style="background: #55dcff; color: #0a0e1a; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reply via Email</a>
                    <button id="close-support-modal" class="btn btn-quiet">Close</button>
                </div>
            </div>
        </div>
    `;

    const tbody = document.getElementById('support-tbody');
    let allRequests = [];

    async function loadRequests() {
        try {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center;">Loading...</td></tr>';
            const q = query(collection(db, 'support'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            allRequests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            renderTable();
        } catch (e) {
            console.error(e);
            tbody.innerHTML = \`<tr><td colspan="6" style="padding:20px; text-align:center; color:#ff758f;">Error: \${e.message}</td></tr>\`;
        }
    }

    function renderTable() {
        tbody.innerHTML = '';
        if (allRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center;">No support requests found.</td></tr>';
            return;
        }

        allRequests.forEach(req => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            const d = new Date(req.createdAt);
            
            tr.innerHTML = \`
                <td style="padding: 12px 16px;">\${d.toLocaleString()}</td>
                <td style="padding: 12px 16px;">\${escapeHTML(req.name)}</td>
                <td style="padding: 12px 16px;">\${escapeHTML(req.email)}</td>
                <td style="padding: 12px 16px;">\${escapeHTML(req.subject)}</td>
                <td style="padding: 12px 16px;">
                    <select class="status-select" data-id="\${escapeHTML(req.id)}" style="background: rgba(0,0,0,0.3); color: \${req.status === 'open' ? '#ff758f' : '#4ade80'}; border: 1px solid var(--line); border-radius: 4px; padding: 4px;">
                        <option value="open" \${req.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="resolved" \${req.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </td>
                <td style="padding: 12px 16px;">
                    <button class="btn view-req" data-id="\${escapeHTML(req.id)}" style="background: var(--line); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">View</button>
                </td>
            \`;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                try {
                    await updateDoc(doc(db, 'support', id), { status: newStatus });
                    e.target.style.color = newStatus === 'open' ? '#ff758f' : '#4ade80';
                } catch(err) {
                    alert('Error: ' + err.message);
                }
            });
        });

        document.querySelectorAll('.view-req').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const req = allRequests.find(r => r.id === id);
                if (req) {
                    document.getElementById('support-details').innerHTML = \`
                        <p><strong>Name:</strong> \${escapeHTML(req.name)}</p>
                        <p><strong>Email:</strong> \${escapeHTML(req.email)}</p>
                        <p><strong>Subject:</strong> \${escapeHTML(req.subject)}</p>
                        <hr style="border: 0; border-top: 1px solid var(--line); margin: 15px 0;">
                        <p style="white-space: pre-wrap; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">\${escapeHTML(req.message)}</p>
                    \`;
                    
                    const mailto = \`mailto:\${encodeURIComponent(req.email)}?subject=Re: \${encodeURIComponent(req.subject)}\`;
                    document.getElementById('reply-mailto').href = mailto;
                    
                    document.getElementById('support-modal').style.display = 'flex';
                }
            });
        });
    }

    document.getElementById('close-support-modal').addEventListener('click', () => {
        document.getElementById('support-modal').style.display = 'none';
    });

    loadRequests();
}
