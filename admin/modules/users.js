import { db , escapeHTML} from '../admin-firebase.js';
import { httpsCallable } from '../admin-firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Users</h2>
            <div id="users-count" style="color: var(--muted);">Loading...</div>
        </div>
        <div class="controls" style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="user-search" placeholder="Search by Email (current page)..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: rgba(0,0,0,0.2); color: var(--text);" />
        </div>
        <div class="table-container" style="background: rgba(11, 16, 35, 0.82); border-radius: 12px; border: 1px solid var(--line); overflow-x: auto;">
            <table id="users-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.02);">
                        <th style="padding: 12px 16px;">Avatar</th>
                        <th style="padding: 12px 16px;">Name</th>
                        <th style="padding: 12px 16px;">Email</th>
                        <th style="padding: 12px 16px;">Verified</th>
                        <th style="padding: 12px 16px;">Status</th>
                        <th style="padding: 12px 16px;">Created</th>
                        <th style="padding: 12px 16px;">Last Sign In</th>
                        <th style="padding: 12px 16px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
            <button id="prev-page" class="btn btn-quiet" disabled>← Previous</button>
            <span id="page-info" style="color: var(--muted);">Page 1</span>
            <button id="next-page" class="btn btn-primary" disabled>Next →</button>
        </div>
        <div id="user-modal" class="modal" style="display:none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
            <div class="modal-content" style="background: #0f1425; padding: 30px; border-radius: 12px; width: 400px; max-width: 90%; border: 1px solid var(--line);">
                <h3 style="margin-top: 0; color: var(--gold-soft);">User Details</h3>
                <div id="user-details-body" style="color: #f4f7ff; line-height: 1.6; margin-bottom: 20px;"></div>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="close-modal" class="btn btn-quiet">Close</button>
                </div>
            </div>
        </div>
    `;

    const tbody = document.getElementById('users-tbody');
    const searchInput = document.getElementById('user-search');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    const listUsers = httpsCallable(null, 'listUsers');
    const disableUser = httpsCallable(null, 'disableUser');
    const enableUser = httpsCallable(null, 'enableUser');

    let currentUsers = [];
    let pageTokens = [null]; // Index matches page number. Page 0 = null.
    let currentPage = 0; // 0-indexed

    async function loadUsers() {
        try {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center;">Loading users...</td></tr>';
            
            const result = await listUsers({ pageSize: 15, pageToken: pageTokens[currentPage] });
            const data = result.data || result;
            currentUsers = data.users || [];
            
            if (data.nextPageToken) {
                pageTokens[currentPage + 1] = data.nextPageToken;
            } else {
                pageTokens.length = currentPage + 1; 
            }
            
            document.getElementById('users-count').innerText = \`Loaded \${currentUsers.length} users\`;
            pageInfo.innerText = \`Page \${currentPage + 1}\`;
            
            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = !data.nextPageToken;
            
            renderTable(currentUsers);
        } catch (error) {
            console.error(error);
            tbody.innerHTML = \`<tr><td colspan="8" style="padding:20px; text-align:center; color: #ff758f;">Failed to load users: \${escapeHTML(error.message)}</td></tr>\`;
        }
    }

    function renderTable(usersToRender) {
        tbody.innerHTML = '';
        if (usersToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center;">No users found.</td></tr>';
            return;
        }
        
        usersToRender.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            const avatar = user.photoURL 
                ? \`<img src="\${escapeHTML(user.photoURL)}" width="32" height="32" style="border-radius:50%">\` 
                : \`<div style="width:32px;height:32px;border-radius:50%;background:#55dcff;display:flex;align-items:center;justify-content:center;color:#0a0e1a;font-weight:bold;">\${escapeHTML((user.email || 'U')[0].toUpperCase())}</div>\`;
            
            tr.innerHTML = \`
                <td style="padding: 12px 16px;">\${avatar}</td>
                <td style="padding: 12px 16px;">\${escapeHTML(user.displayName || 'N/A')}</td>
                <td style="padding: 12px 16px;">\${escapeHTML(user.email)}</td>
                <td style="padding: 12px 16px; color: \${user.emailVerified ? '#4ade80' : '#aeb8d2'};">\${user.emailVerified ? '✓ Verified' : '✗ Unverified'}</td>
                <td style="padding: 12px 16px;"><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background: \${user.disabled ? 'rgba(255,117,143,0.1)' : 'rgba(74,222,128,0.1)'}; color: \${user.disabled ? '#ff758f' : '#4ade80'};\=">\${user.disabled ? 'Disabled' : 'Enabled'}</span></td>
                <td style="padding: 12px 16px; font-size: 0.9rem;">\${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 12px 16px; font-size: 0.9rem;">\${user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 12px 16px; display: flex; gap: 8px;">
                    <button class="btn view-user" data-uid="\${escapeHTML(user.uid)}" style="padding: 6px 12px; font-size: 0.8rem;">View</button>
                    <button class="btn toggle-user" data-uid="\${escapeHTML(user.uid)}" data-disabled="\${escapeHTML(user.disabled)}" style="padding: 6px 12px; font-size: 0.8rem; background: \${user.disabled ? '#4ade80' : '#ff758f'}; color: #0a0e1a;">
                        \${user.disabled ? 'Enable' : 'Disable'}
                    </button>
                </td>
            \`;
            tbody.appendChild(tr);
        });

        attachRowEvents();
    }

    function attachRowEvents() {
        document.querySelectorAll('.toggle-user').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                const isDisabled = e.target.getAttribute('data-disabled') === 'true';
                
                try {
                    btn.disabled = true;
                    btn.innerText = 'Wait...';
                    if (!isDisabled) {
                        if (!confirm('Are you sure? This will prevent the user from signing in.')) {
                            btn.disabled = false;
                            btn.innerText = 'Disable';
                            return;
                        }
                        await disableUser({ uid });
                    } else {
                        await enableUser({ uid });
                    }
                    await loadUsers();
                } catch(err) {
                    alert('Error changing user status: ' + err.message);
                    btn.disabled = false;
                    btn.innerText = isDisabled ? 'Enable' : 'Disable';
                }
            });
        });

        document.querySelectorAll('.view-user').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                const user = currentUsers.find(u => u.uid === uid);
                
                let role = 'customer';
                try {
                    const profileSnap = await getDoc(doc(db, 'users', uid));
                    if(profileSnap.exists()) {
                        role = profileSnap.data().role || 'customer';
                    }
                } catch(e) { console.error('Error fetching role', e); }

                document.getElementById('user-details-body').innerHTML = \`
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">UID:</strong> <span style="user-select: all;">\${escapeHTML(user.uid)}</span></div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Name:</strong> \${escapeHTML(user.displayName || 'N/A')}</div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Email:</strong> <a href="mailto:\${escapeHTML(user.email)}" style="color: #55dcff;">\${escapeHTML(user.email)}</a></div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Verification:</strong> \${user.emailVerified ? 'Verified' : 'Unverified'}</div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Role:</strong> \${escapeHTML(role.toUpperCase())}</div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Status:</strong> \${user.disabled ? '<span style="color:#ff758f;">Disabled</span>' : '<span style="color:#4ade80;">Enabled</span>'}</div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Created:</strong> \${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</div>
                    <div style="margin-bottom: 10px;"><strong style="color: var(--muted);">Last Login:</strong> \${user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleString() : 'N/A'}</div>
                \`;
                document.getElementById('user-modal').style.display = 'flex';
            });
        });
    }

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (!val) {
            renderTable(currentUsers);
            return;
        }
        const filtered = currentUsers.filter(u => 
            (u.email && u.email.toLowerCase().includes(val)) || 
            (u.displayName && u.displayName.toLowerCase().includes(val)) ||
            (u.uid && u.uid.toLowerCase().includes(val))
        );
        renderTable(filtered);
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadUsers();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (pageTokens[currentPage + 1]) {
            currentPage++;
            loadUsers();
        }
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('user-modal').style.display = 'none';
    });
    
    document.getElementById('user-modal').addEventListener('click', (e) => {
        if (e.target.id === 'user-modal') e.target.style.display = 'none';
    });

    loadUsers();
}
