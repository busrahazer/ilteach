document.addEventListener('DOMContentLoaded', () => {
  updateChatList();

  const lastChatId = localStorage.getItem('lastChatId');
  if (lastChatId) {
    loadChatFromLocal(lastChatId);
    hideStartPrompt();
  } else {
    showStartPrompt();
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
          updateUploadedFilesList(data.files);
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

// --- Yardımcı fonksiyonlar ---
function updateUploadedFilesList(files) {
  const uploadedList = document.getElementById('uploadedFiles');
  uploadedList.innerHTML = '';
  files.forEach(filename => {
    const li = document.createElement('li');
    li.textContent = filename;
    uploadedList.appendChild(li);
  });
}

function hideStartPrompt() {
  document.getElementById('startPrompt').style.display = 'none';
}

function showStartPrompt() {
  document.getElementById('startPrompt').style.display = 'block';
  document.getElementById('chat-container').innerHTML = '';
  document.getElementById('chatTitle').textContent = 'Yeni Sohbet';
  clearNotesUI();
  currentChatId = null;
  localStorage.removeItem('lastChatId');
}

// Sohbet başlığını akıllıca seçmek için basit örnek:
function smartTitleFromMessage(message) {
  if (!message) return 'Yeni Sohbet';
  const words = message.trim().split(/\s+/).slice(0, 6);
  let title = words.join(' ');
  if (message.trim().split(/\s+/).length > 6) title += '...';
  return title;
}

// Listelenen kaynaklar
let selectedFiles = []; // her öğe: { file, status: 'pending' | 'uploading' | 'success' | 'error' }
document.getElementById('fileInput').addEventListener('change', event => {
  const input = event.target;
  const files = Array.from(input.files);

  files.forEach(file => {
    selectedFiles.push({ file, status: 'pending' });
  });

  updateFileListUI();
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  for (const entry of selectedFiles) {
    if (entry.status === 'success') continue; // zaten yüklenmiş

    entry.status = 'uploading';
    updateFileListUI();

    const formData = new FormData();
    formData.append('files', entry.file);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        entry.status = 'success';
      } else {
        entry.status = 'error';
      }
    } catch (err) {
      entry.status = 'error';
    }

    updateFileListUI();
  }
});

  
// --- Temel fonksiyonlar ---
// Sohbet başlığı oluşturma fonksiyonu
function smartTitleFromMessage(message) {
  if (!message) return 'Yeni Sohbet';
  const words = message.trim().split(/\s+/).slice(0, 6);
  let title = words.join(' ');
  if (message.trim().split(/\s+/).length > 6) title += '...';
  return title;
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-container');

  const wrapper = document.createElement('div');
  wrapper.classList.add('message', `message-${role}`);
  wrapper.textContent = text;
  wrapper.innerHTML = text.replace(/\n/g, "<br>");

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

// askQuestion fonksiyonu içinde, cevap geldikten sonra başlığı güncelle
window.askQuestion = function () {
  const questionInput = document.getElementById('questionInput');
  const question = questionInput.value.trim();
  if (!question) return;

  const mode = document.getElementById('modeRetrieval')?.checked ? 'retrieval' : 'general';

  // "not al" veya "kaydet" gibi komutları kontrol et
  if (question.toLowerCase().includes('not al') || question.toLowerCase().includes('kaydet')) {
    // Özel bir not alma isteği gönder
    fetch('/take-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: question, chatId: currentChatId })
    })
    .then(response => response.json())
    .then(data => {
      if (data.noteContent) {
        autoSaveNote(data.noteContent);
        appendMessage('bot', 'Notunuz başarıyla kaydedildi.');
      } else {
        appendMessage('bot', data.error || 'Not alınamadı.');
      }
    })
    .catch(err => {
      console.error('Not alma hatası:', err);
      appendMessage('bot', 'Not alma sırasında bir hata oluştu.');
    });

    questionInput.value = '';
    return;
  }

  // Normal sohbet akışı devam ediyor
  appendMessage('user', question);
  questionInput.value = '';
  hideStartPrompt();

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
  .then(async data => {
    const answer = data.answer || data.error || "Yanıt alınamadı.";
    appendMessage('bot', answer);

    if (!currentChatId) {
      currentChatId = generateChatId();
      let title = smartTitleFromMessage(question);
      try {
        const res = await fetch('/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.title) title = json.title;
        }
      } catch (err) {
        console.warn("Başlık üretilemedi, varsayılan kullanılacak:", err);
      }
      saveChatToLocal(currentChatId, title, [{ q: question, a: answer }]);
      updateHeaderTitle(title);
    } else {
      const existing = JSON.parse(localStorage.getItem(`chat-${currentChatId}`));
      existing.messages.push({ q: question, a: answer });
      saveChatToLocal(currentChatId, existing.title, existing.messages);
      updateHeaderTitle(existing.title);
    }

    updateChatList();
    localStorage.setItem('lastChatId', currentChatId);
    loadNotes(currentChatId);
  });
};

window.saveChatToLocal = function (chatId, title, messages) {
  localStorage.setItem(`chat-${chatId}`, JSON.stringify({ title, messages }));
  updateChatList();
};

window.loadChatFromLocal = function (chatId) {
  const chatData = JSON.parse(localStorage.getItem(`chat-${chatId}`));
  if (!chatData) return;

  const container = document.getElementById('chat-container');
  container.innerHTML = '';
  document.getElementById('chatTitle').textContent = chatData.title;
  updateHeaderTitle(chatData.title);

  chatData.messages.forEach(msg => {
    appendMessage('user', msg.q);
    appendMessage('bot', msg.a);
  });

  currentChatId = chatId;
  localStorage.setItem('lastChatId', chatId);
  loadNotes(chatId);
  hideStartPrompt();
};

function updateHeaderTitle(title) {
  
}

window.updateChatList = function () {
  const list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';

  Object.keys(localStorage)
    .filter(key => key.startsWith('chat-'))
    // tarih karşılaştırması olmadan basit sıralama yapabiliriz (isteğe göre)
    .forEach(key => {
      const chatData = JSON.parse(localStorage.getItem(key));
      if (!chatData) return;

      const li = document.createElement('li');
      li.className = 'flex justify-between items-center';

      const btn = document.createElement('button');
      btn.textContent = chatData.title || 'Yeni Sohbet';
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
};

window.clearChat = function (silent = false) {
  document.getElementById('chat-container').innerHTML = '';
  document.getElementById('questionInput').value = '';
  document.getElementById('chatTitle').textContent = "Yeni Sohbet";
  updateHeaderTitle('AI Ders Asistanı');
  clearNotesUI();

  if (!silent && currentChatId) {
    localStorage.removeItem(`chat-${currentChatId}`);
  }

  currentChatId = null;
  localStorage.removeItem('lastChatId');
  showStartPrompt();
};

window.startNewChat = function () {
  clearChat(true); // Arayüzü temizle, localStorage'dan silme
  currentChatId = null;
  localStorage.removeItem('lastChatId');
  showStartPrompt();
  updateChatList();
};

// --- Not Defteri ---
window.loadNotes = function (chatId) {
  const notes = JSON.parse(localStorage.getItem(`notes-${chatId}`)) || [];
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';

  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note';

    // İçerik alanı
    const textarea = document.createElement('textarea');
    textarea.value = note.content || '';
    textarea.className = 'note-content';
    textarea.placeholder = 'Kısa bir not alın...';
    textarea.addEventListener('input', () => {
      notes[index].content = textarea.value;
      localStorage.setItem(`notes-${chatId}`, JSON.stringify(notes));
    });

    // Silme butonu
    const delBtn = document.createElement('button');
    delBtn.title = 'Notu Sil';
    delBtn.className = 'delete-note-btn';
    delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    delBtn.onclick = () => {
      notes.splice(index, 1);
      localStorage.setItem(`notes-${chatId}`, JSON.stringify(notes));
      loadNotes(chatId);
    };

    div.appendChild(textarea);
    div.appendChild(delBtn);
    noteList.appendChild(div);
  });
};

window.addEmptyNote = function () {
  if (!currentChatId) return alert('Lütfen önce bir sohbet başlatın.');

  const notes = JSON.parse(localStorage.getItem(`notes-${currentChatId}`)) || [];
  const timestamp = new Date().toISOString();
  notes.push({ title: '', content: '', created: timestamp });

  localStorage.setItem(`notes-${currentChatId}`, JSON.stringify(notes));
  loadNotes(currentChatId);
};

function clearNotesUI() {
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';
}

window.autoSaveNote = function (noteContent) {
  if (!currentChatId) return;
  const notes = JSON.parse(localStorage.getItem(`notes-${currentChatId}`)) || [];
  const timestamp = new Date().toISOString();
  notes.push({ content: noteContent, created: timestamp });
  localStorage.setItem(`notes-${currentChatId}`, JSON.stringify(notes));
  loadNotes(currentChatId);
};
function generateChatId() {
  return 'chat-' + Date.now();
}

// Pomodoro widget
let customTimer = null;

function startCustomPomodoro() {
  const duration = parseInt(document.getElementById('pomodoroDuration').value);
  let timeLeft = duration;
  const display = document.getElementById('pomodoroTimer');

  clearInterval(customTimer);

  function updateDisplay() {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    display.textContent = `${minutes}:${seconds}`;

    if (timeLeft <= 0) {
      clearInterval(customTimer);
      display.textContent = 'Bitti!';
      // Optional: play sound here
    }

    timeLeft--;
  }

  updateDisplay();
  customTimer = setInterval(updateDisplay, 1000);
}

function closePomodoroWidget() {
  const widget = document.getElementById('pomodoroWidget');
  if (widget) {
    widget.classList.add('hidden');
  }
}

function togglePomodoroWidget() {
  const widget = document.getElementById('pomodoroWidget');

  if (!widget) return;

  const isVisible = !widget.classList.contains('hidden');

  if (isVisible) {
    widget.classList.add('hidden');
  } else {
    widget.classList.remove('hidden');
  }
}

// Draggable widget
document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('pomodoroWidget');
  const header = widget.querySelector('.pomodoro-header');
  let isDragging = false, offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - widget.offsetLeft;
    offsetY = e.clientY - widget.offsetTop;
    widget.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    widget.style.left = `${e.clientX - offsetX}px`;
    widget.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    widget.style.cursor = 'default';
  });
});


