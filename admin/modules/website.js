import { db } from '../admin-firebase.js';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, addDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Website Content</h2>
        </div>
        <div class="tabs">
            <button class="tab-btn active" data-tab="hero">Hero Section</button>
            <button class="tab-btn" data-tab="announcements">Announcements</button>
            <button class="tab-btn" data-tab="banners">Banners</button>
            <button class="tab-btn" data-tab="contact">Contact Info</button>
        </div>
        <div class="tab-content" id="tab-hero">
            <h3>Hero Section</h3>
            <label>Title</label><input type="text" id="hero-title" class="form-control" />
            <label>Subtitle</label><input type="text" id="hero-subtitle" class="form-control" />
            <label>Description</label><textarea id="hero-desc" class="form-control"></textarea>
            <label>CTA Button Text</label><input type="text" id="hero-cta-text" class="form-control" />
            <label>CTA Button Link</label><input type="text" id="hero-cta-link" class="form-control" />
            <button id="save-hero" class="btn btn-primary">Save Hero</button>
        </div>
        <div class="tab-content" id="tab-announcements" style="display:none;">
            <h3>Announcements (Coming Soon)</h3>
        </div>
        <div class="tab-content" id="tab-banners" style="display:none;">
            <h3>Banners (Coming Soon)</h3>
        </div>
        <div class="tab-content" id="tab-contact" style="display:none;">
            <h3>Contact Info</h3>
            <label>Email</label><input type="text" id="contact-email" class="form-control" />
            <label>Phone</label><input type="text" id="contact-phone" class="form-control" />
            <button id="save-contact" class="btn btn-primary">Save Contact Info</button>
        </div>
    `;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            e.target.classList.add('active');
            const tabId = e.target.getAttribute('data-tab');
            document.getElementById(\`tab-${tabId}\`).style.display = 'block';
        });
    });

    const heroRef = doc(db, 'websiteContent', 'hero');
    const heroSnap = await getDoc(heroRef);
    if (heroSnap.exists()) {
        const data = heroSnap.data();
        document.getElementById('hero-title').value = data.title || '';
        document.getElementById('hero-subtitle').value = data.subtitle || '';
        document.getElementById('hero-desc').value = data.description || '';
        document.getElementById('hero-cta-text').value = data.ctaText || '';
        document.getElementById('hero-cta-link').value = data.ctaLink || '';
    }

    document.getElementById('save-hero').addEventListener('click', async () => {
        await setDoc(heroRef, {
            title: document.getElementById('hero-title').value,
            subtitle: document.getElementById('hero-subtitle').value,
            description: document.getElementById('hero-desc').value,
            ctaText: document.getElementById('hero-cta-text').value,
            ctaLink: document.getElementById('hero-cta-link').value,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(db, 'activityLog'), {
            action: 'edit',
            resource: 'websiteContent/hero',
            timestamp: serverTimestamp()
        });

        alert('Hero section saved!');
    });

    const contactRef = doc(db, 'websiteContent', 'contact');
    const contactSnap = await getDoc(contactRef);
    if (contactSnap.exists()) {
        const data = contactSnap.data();
        document.getElementById('contact-email').value = data.email || '';
        document.getElementById('contact-phone').value = data.phone || '';
    }

    document.getElementById('save-contact').addEventListener('click', async () => {
        await setDoc(contactRef, {
            email: document.getElementById('contact-email').value,
            phone: document.getElementById('contact-phone').value,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(db, 'activityLog'), {
            action: 'edit',
            resource: 'websiteContent/contact',
            timestamp: serverTimestamp()
        });

        alert('Contact info saved!');
    });
}
