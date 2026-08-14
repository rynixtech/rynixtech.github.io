export function createTable(container, { columns, data, onRowClick, emptyMessage = 'No data available', sortable = false, pagination }) {
  container.innerHTML = '';
  
  const tableWrapper = document.createElement('div');
  tableWrapper.style.cssText = 'width: 100%; overflow-x: auto; background: #0f1425; border: 1px solid rgba(183,202,255,0.12); border-radius: 8px;';
  
  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; text-align: left;';
  
  // Thead
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); background: rgba(183,202,255,0.05);">
      ${columns.map(col => `
        <th style="padding: 12px 16px; color: #aeb8d2; font-weight: 600; cursor: ${sortable && col.sortable !== false ? 'pointer' : 'default'}; width: ${col.width || 'auto'};" data-key="${col.key}">
          ${col.label} ${sortable && col.sortable !== false ? '<span style="font-size: 0.8em; opacity: 0.5;">↕</span>' : ''}
        </th>
      `).join('')}
    </tr>
  `;
  table.appendChild(thead);
  
  // Tbody
  const tbody = document.createElement('tbody');
  
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${columns.length}" style="padding: 30px; text-align: center; color: #aeb8d2;">
          ${emptyMessage}
        </td>
      </tr>
    `;
  } else {
    data.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.style.cssText = `border-bottom: 1px solid rgba(183,202,255,0.06); transition: background 0.2s; cursor: ${onRowClick ? 'pointer' : 'default'};`;
      tr.addEventListener('mouseenter', () => tr.style.background = '#161c35');
      tr.addEventListener('mouseleave', () => tr.style.background = 'transparent');
      
      if (onRowClick) {
        tr.addEventListener('click', () => onRowClick(row));
      }
      
      tr.innerHTML = columns.map(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
        }
        return `<td style="padding: 12px 16px; color: #f4f7ff;">${val !== undefined ? val : ''}</td>`;
      }).join('');
      
      tbody.appendChild(tr);
    });
  }
  
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
  
  // Pagination
  if (pagination) {
    const { page = 1, pageSize = 10, total = 0, onPageChange } = pagination;
    const totalPages = Math.ceil(total / pageSize) || 1;
    
    const pagContainer = document.createElement('div');
    pagContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 15px 0; color: #aeb8d2; font-size: 0.9rem;';
    
    pagContainer.innerHTML = `
      <div>Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total}</div>
      <div style="display: flex; gap: 5px;">
        <button class="pag-prev" ${page <= 1 ? 'disabled' : ''} style="padding: 6px 12px; background: rgba(183,202,255,0.12); border: none; color: ${page <= 1 ? '#aeb8d2' : '#f4f7ff'}; border-radius: 4px; cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};">Prev</button>
        <span style="padding: 6px 12px;">${page} / ${totalPages}</span>
        <button class="pag-next" ${page >= totalPages ? 'disabled' : ''} style="padding: 6px 12px; background: rgba(183,202,255,0.12); border: none; color: ${page >= totalPages ? '#aeb8d2' : '#f4f7ff'}; border-radius: 4px; cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};">Next</button>
      </div>
    `;
    
    if (page > 1) {
      pagContainer.querySelector('.pag-prev').addEventListener('click', () => onPageChange(page - 1));
    }
    if (page < totalPages) {
      pagContainer.querySelector('.pag-next').addEventListener('click', () => onPageChange(page + 1));
    }
    
    container.appendChild(pagContainer);
  }
}

export function showTableSkeleton(container, { columns, rows = 5 }) {
  const dummyData = Array(rows).fill({});
  const skelColumns = columns.map(c => ({
    ...c,
    render: () => `<div style="height: 20px; background: rgba(183,202,255,0.1); border-radius: 4px; animation: pulse 1.5s infinite;"></div>`
  }));
  
  if (!document.getElementById('table-skeleton-style')) {
    const style = document.createElement('style');
    style.id = 'table-skeleton-style';
    style.textContent = `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
    document.head.appendChild(style);
  }
  
  createTable(container, { columns: skelColumns, data: dummyData, sortable: false });
}
