export function showToast({ message, type = 'info', duration = 4000 }) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const colors = {
    success: { bg: 'rgba(100, 223, 172, 0.1)', border: '#64dfac', text: '#64dfac' },
    error: { bg: 'rgba(255, 117, 143, 0.1)', border: '#ff758f', text: '#ff758f' },
    warning: { bg: 'rgba(246, 198, 87, 0.1)', border: '#f6c657', text: '#f6c657' },
    info: { bg: 'rgba(85, 220, 255, 0.1)', border: '#55dcff', text: '#55dcff' }
  };

  const theme = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #0f1425;
    border-left: 4px solid ${theme.border};
    border-radius: 4px;
    padding: 12px 20px;
    color: #f4f7ff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transform: translateX(120%);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span style="margin-right: 15px;">${message}</span>
    <button style="background: none; border: none; color: #aeb8d2; cursor: pointer; font-size: 1.2rem; padding: 0;">&times;</button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });

  const dismiss = () => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };

  toast.querySelector('button').addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}
