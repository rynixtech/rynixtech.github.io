let currentModal = null;

export function showModal({ title, content, footer, size = 'md', onClose }) {
  if (currentModal) hideModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 14, 26, 0.8); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center;
    z-index: 1000; opacity: 0; transition: opacity 0.2s;
  `;

  const sizes = { sm: '400px', md: '600px', lg: '800px', full: '90vw' };
  const modalWidth = sizes[size] || sizes.md;

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = `
    width: ${modalWidth}; max-height: 90vh; background: #0f1425;
    border: 1px solid rgba(183,202,255,0.12); border-radius: 8px;
    display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    transform: translateY(20px); transition: transform 0.2s;
  `;

  let contentHtml = typeof content === 'string' ? content : '';
  let footerHtml = typeof footer === 'string' ? footer : '';

  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif;">${title}</h3>
      <button class="modal-close" style="background: none; border: none; color: #aeb8d2; font-size: 1.5rem; cursor: pointer;">&times;</button>
    </div>
    <div class="modal-body" style="padding: 20px; overflow-y: auto; flex: 1;">
      ${contentHtml}
    </div>
    ${footer ? `<div class="modal-footer" style="padding: 20px; border-top: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: flex-end; gap: 10px;">${footerHtml}</div>` : ''}
  `;

  if (typeof content !== 'string' && content instanceof Element) {
    modal.querySelector('.modal-body').appendChild(content);
  }
  if (footer && typeof footer !== 'string' && footer instanceof Element) {
    modal.querySelector('.modal-footer').appendChild(footer);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Animate in
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
    modal.style.transform = 'translateY(0)';
  });

  const closeHandler = () => {
    hideModal();
    if (onClose) onClose();
  };

  modal.querySelector('.modal-close').addEventListener('click', closeHandler);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeHandler();
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  currentModal = { backdrop, modal, closeHandler };
  return modal;
}

export function hideModal() {
  if (!currentModal) return;
  const { backdrop, modal } = currentModal;
  
  backdrop.style.opacity = '0';
  modal.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    currentModal = null;
  }, 200);
}

export function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '10px';
    footer.style.width = '100%';
    footer.style.justifyContent = 'flex-end';
    
    footer.innerHTML = `
      <button class="btn-cancel" style="padding: 8px 16px; background: rgba(183,202,255,0.12); border: none; color: #f4f7ff; border-radius: 4px; cursor: pointer;">${cancelText}</button>
      <button class="btn-confirm" style="padding: 8px 16px; background: ${danger ? '#ff758f' : '#55dcff'}; border: none; color: #0a0e1a; border-radius: 4px; cursor: pointer; font-weight: bold;">${confirmText}</button>
    `;

    const content = `<p>${message}</p>`;

    showModal({
      title,
      content,
      footer,
      size: 'sm',
      onClose: () => resolve(false)
    });

    const modalEl = currentModal.modal;
    modalEl.querySelector('.btn-cancel').addEventListener('click', () => {
      hideModal();
      resolve(false);
    });
    modalEl.querySelector('.btn-confirm').addEventListener('click', () => {
      hideModal();
      resolve(true);
    });
  });
}
