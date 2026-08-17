export async function render(container) {
    container.innerHTML = `
        <div class="state-container empty-state" style="padding:40px;text-align:center">
            <span class="empty-state-icon" style="font-size: 3rem; display: block; margin-bottom: 1rem;">📁</span>
            <h3>No Data Available</h3>
            <p class="text-muted">There are no items to display here yet.</p>
        </div>
    `;
}
