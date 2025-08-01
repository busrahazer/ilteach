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
