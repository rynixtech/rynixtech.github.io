import { db } from '../admin-firebase.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Users</h2>
            <div id="users-count">Loading...</div>
        </div>
        <div class="controls">
            <input type="text" id="user-search" placeholder="Search by Email..." />
        </div>
        <div class="table-container">
            <table id="users-table">
                <thead>
                    <tr>
                        <th>Avatar</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Verified</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Last Sign In</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>
        <div id="user-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>User Details</h3>
                <div id="user-details-body"></div>
                <button id="close-modal">Close</button>
            </div>
        </div>
    `;

    const tbody = document.getElementById('users-tbody');
    const functions = getFunctions();
    const listUsers = httpsCallable(functions, 'listUsers');
    const disableUser = httpsCallable(functions, 'disableUser');
    const enableUser = httpsCallable(functions, 'enableUser');

    async function loadUsers() {
        try {
            const result = await listUsers({ pageSize: 20 });
            const users = result.data.users;
            
            document.getElementById('users-count').innerText = \`Total loaded: \${users.length}\`;
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                const avatar = user.photoURL 
                    ? \`<img src="\${user.photoURL}" width="32" height="32" style="border-radius:50%">\` 
                    : \`<div style="width:32px;height:32px;border-radius:50%;background:#55dcff;display:flex;align-items:center;justify-content:center;color:#0a0e1a;font-weight:bold;">\${(user.email || 'U')[0].toUpperCase()}</div>\`;
                
                tr.innerHTML = `
                    <td>\${avatar}</td>
                    <td>\${user.displayName || 'N/A'}</td>
                    <td>\${user.email}</td>
                    <td>\${user.emailVerified ? '✓' : '✗'}</td>
                    <td><span class="badge \${user.disabled ? 'danger' : 'success'}">\${user.disabled ? 'Disabled' : 'Enabled'}</span></td>
                    <td>\${new Date(user.metadata.creationTime).toLocaleDateString()}</td>
                    <td>\${new Date(user.metadata.lastSignInTime).toLocaleDateString()}</td>
                    <td>
                        <button class="btn view-user" data-uid="\${user.uid}">View</button>
                        <button class="btn \${user.disabled ? 'success' : 'danger'} toggle-user" data-uid="\${user.uid}" data-disabled="\${user.disabled}">
                            \${user.disabled ? 'Enable' : 'Disable'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.toggle-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const uid = e.target.getAttribute('data-uid');
                    const isDisabled = e.target.getAttribute('data-disabled') === 'true';
                    
                    if (!isDisabled) {
                        if (!confirm('Are you sure? This will prevent the user from signing in.')) return;
                        await disableUser({ uid });
                    } else {
                        await enableUser({ uid });
                    }
                    loadUsers();
                });
            });

            document.querySelectorAll('.view-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const uid = e.target.getAttribute('data-uid');
                    const user = users.find(u => u.uid === uid);
                    
                    const profileSnap = await getDoc(doc(db, 'users', uid));
                    const role = profileSnap.exists() ? profileSnap.data().role : 'user';

                    document.getElementById('user-details-body').innerHTML = `
                        <p><strong>UID:</strong> \${user.uid}</p>
                        <p><strong>Name:</strong> \${user.displayName || 'N/A'}</p>
                        <p><strong>Email:</strong> \${user.email} (\${user.emailVerified ? 'Verified' : 'Unverified'})</p>
                        <p><strong>Role:</strong> \${role}</p>
                        <p><strong>Status:</strong> \${user.disabled ? 'Disabled' : 'Enabled'}</p>
                        <p><strong>Created:</strong> \${new Date(user.metadata.creationTime).toLocaleString()}</p>
                    `;
                    document.getElementById('user-modal').style.display = 'block';
                });
            });
            
        } catch (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="8">Failed to load users. Cloud Functions required.</td></tr>';
        }
    }

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('user-modal').style.display = 'none';
    });

    loadUsers();
}
