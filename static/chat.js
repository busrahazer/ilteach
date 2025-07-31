alert("JS yüklendi!");

document.addEventListener('DOMContentLoaded', () => {
  updateChatList();

  const lastChatId = localStorage.getItem('lastChatId');
  if (lastChatId) {
    loadChatFromLocal(lastChatId);
  }

  const uploadForm = document.getElementById('uploadForm');
  const uploadedList = document.getElementById('uploadedFiles');

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData();
    const files = document.getElementById('fileInput').files;

    if (!files.length) {
      alert('Lütfen en az bir dosya seçin.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    fetch('/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || data.error);
        if (data.files && data.files.length) {
          uploadedList.innerHTML = '';
          data.files.forEach(filename => {
            const li = document.createElement('li');
            li.textContent = filename;
            uploadedList.appendChild(li);
          });
        }
      })
      .catch(err => {
        console.error('Yükleme Hatası:', err);
      });
  });

  // Enter tuşuyla soru gönder
  document.getElementById('questionInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      askQuestion();
    }
  });
});

let currentChatId = null;

function generateChatId() {
  return 'chat-' + Date.now();
}

function askQuestion() {
  const questionInput = document.getElementById('questionInput');
  const question = questionInput.value.trim();
  if (!question) return;

  appendMessage('user', question);
  questionInput.value = '';

  const mode = document.getElementById('modeRetrieval')?.checked ? 'retrieval' : 'general';
  const chatContainer = document.getElementById('chat-container');

  fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, mode })
  })
    .then(async response => {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sunucu hatası: ${response.status} - ${text}`);
      }
      return response.json();
    })
    .then(data => {
      const answer = data.answer || data.error || "Yanıt alınamadı.";
      appendMessage('bot', answer);

      // AI'a not aldırma kontrolü
      if (question.toLowerCase().includes('not defterine kaydet')) {
        const pureNote = answer.split('\n')[0]; // sadece ilk satır not
        autoSaveNote(pureNote);
      }

      // Not defterine oto
      if (question.toLowerCase().includes('not defterine kaydet') && answer) {
        const pureNote = answer.split('\n')[0];
        autoSaveNote(pureNote);
}
      // Yeni sohbet mi başlatıldı?
      if (!currentChatId) {
        currentChatId = generateChatId();
        const title = question.split(' ').slice(0, 4).join(' ') + '...';
        saveChatToLocal(currentChatId, title, [{ q: question, a: answer }]);
      } else {
        const existing = JSON.parse(localStorage.getItem(`chat-${currentChatId}`));
        existing.messages.push({ q: question, a: answer });
        saveChatToLocal(currentChatId, existing.title, existing.messages);
      }

      localStorage.setItem('lastChatId', currentChatId);
    })
    .catch(error => {
      appendMessage('bot', `❌ Hata: ${error.message}`);
    });
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `p-2 rounded ${role === 'user' ? 'text-right bg-blue-100' : 'text-left bg-gray-200'}`;
  div.textContent = text;
  document.getElementById('chat-container').appendChild(div);
  document.getElementById('chat-container').scrollTop = document.getElementById('chat-container').scrollHeight;
}

function saveChatToLocal(chatId, title, messages) {
  localStorage.setItem(`chat-${chatId}`, JSON.stringify({ title, messages }));
  updateChatList();
}

function loadChatFromLocal(chatId) {
  const chatData = JSON.parse(localStorage.getItem(`chat-${chatId}`));
  if (!chatData) return;

  const container = document.getElementById('chat-container');
  container.innerHTML = '';
  document.getElementById('chatTitle').textContent = chatData.title;

  chatData.messages.forEach(msg => {
    appendMessage('user', msg.q);
    appendMessage('bot', msg.a);
  });

  currentChatId = chatId;
  localStorage.setItem('lastChatId', chatId);

  // Notları da yükle
  loadNotes(chatId);
}

function updateChatList() {
  const list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';

  Object.keys(localStorage)
    .filter(key => key.startsWith('chat-'))
    .forEach(key => {
      const chatData = JSON.parse(localStorage.getItem(key));
      if (!chatData) return;

      const li = document.createElement('li');
      li.className = 'flex justify-between items-center';

      const btn = document.createElement('button');
      btn.textContent = chatData.title;
      btn.className = 'text-blue-600 hover:underline text-left w-full';
      btn.onclick = () => {
        loadChatFromLocal(key.replace('chat-', ''));
      };

      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.className = 'ml-2 text-red-600';
      del.onclick = () => {
        localStorage.removeItem(key);
        if (`chat-${currentChatId}` === key) clearChat(true);
        updateChatList();
      };

      li.appendChild(btn);
      li.appendChild(del);
      list.appendChild(li);
    });
}

function clearChat(silent = false) {
  document.getElementById('chat-container').innerHTML = '';
  document.getElementById('questionInput').value = '';

  if (!silent && currentChatId) {
    localStorage.removeItem(`chat-${currentChatId}`);
  }

  currentChatId = null;
  localStorage.removeItem('lastChatId');
  document.getElementById('chatTitle').textContent = "Yeni Sohbet";
}

function startNewChat() {
  clearChat(true); // Mevcut sohbeti sadece arayüzden sil, localStorage’dan silme
  document.getElementById('chatTitle').textContent = "Yeni Sohbet";
  currentChatId = null;
  localStorage.removeItem('lastChatId');
}

// Not defteri func.
function loadNotes(chatId) {
  const notes = JSON.parse(localStorage.getItem(`notes-${chatId}`)) || [];
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';

  notes.forEach((note, index) => {
    const li = document.createElement('li');
    const textarea = document.createElement('textarea');

    textarea.value = note;
    textarea.className = 'w-full p-2 border rounded resize-none';
    textarea.oninput = () => saveNotes(chatId);

    li.appendChild(textarea);
    noteList.appendChild(li);
  });

  addEmptyNote(); // her zaman altta boş satır
}

function saveNotes(chatId) {
  const noteList = document.querySelectorAll('#noteList textarea');
  const notes = Array.from(noteList)
    .map(t => t.value.trim())
    .filter(t => t !== '');

  localStorage.setItem(`notes-${chatId}`, JSON.stringify(notes));
}

function addEmptyNote() {
  if (!currentChatId) return;

  const noteList = document.getElementById('noteList');
  const li = document.createElement('li');
  const textarea = document.createElement('textarea');

  textarea.placeholder = 'Yeni not...';
  textarea.className = 'w-full p-2 border rounded resize-none';
  textarea.onblur = () => saveNotes(currentChatId);

  li.appendChild(textarea);
  noteList.appendChild(li);
  textarea.focus();
}

function autoSaveNote(text) {
  if (!currentChatId) return;
  const notes = JSON.parse(localStorage.getItem(`notes-${currentChatId}`)) || [];
  notes.push(text);
  localStorage.setItem(`notes-${currentChatId}`, JSON.stringify(notes));
  loadNotes(currentChatId);
}
