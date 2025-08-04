document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('aside.left-sidebar');
  const toggleLeft = document.getElementById('toggleSidebar');
  const notesPanel = document.getElementById('notesPanel');
  const toggleRight = document.getElementById('toggleNotes');

  // Sol Menü Toggle
  toggleLeft?.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-expanded');
    sidebar.classList.toggle('side-toggle');
  });

  // Not Defteri Toggle
  toggleRight?.addEventListener('click', () => {
    notesPanel.classList.toggle('hidden');
  });

  // İlk başta sağ panel gizli
  notesPanel?.classList.add('hidden');
});

  // Dosya yükleme UI
function updateFileListUI() {
  const ul = document.getElementById('uploadedFiles');
  ul.innerHTML = '';

  selectedFiles.forEach((entry, index) => {
    const li = document.createElement('li');
    li.classList.add('flex', 'justify-between', 'items-center');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = entry.file.name;

    const statusSpan = document.createElement('span');
    statusSpan.classList.add('text-xs', 'ml-2');

    switch (entry.status) {
      case 'pending': statusSpan.textContent = '🚫 Yüklenmedi'; break;
      case 'uploading': statusSpan.textContent = '⏳ Yükleniyor'; break;
      case 'success': statusSpan.textContent = '✅ Yüklendi'; break;
      case 'error': statusSpan.textContent = '❌ Hata'; break;
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌';
    removeBtn.classList.add('ml-2', 'text-red-500', 'hover:text-red-700', 'text-sm');
    removeBtn.onclick = () => {
      selectedFiles.splice(index, 1);
      updateFileListUI();
    };

    li.appendChild(nameSpan);
    li.appendChild(statusSpan);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
}