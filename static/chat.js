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

// --- Temel fonksiyonlar ---
// Sohbet başlığı oluşturma fonksiyonu
function smartTitleFromMessage(message) {
  if (!message) return 'Yeni Sohbet';
  const words = message.trim().split(/\s+/).slice(0, 6);
  let title = words.join(' ');
  if (message.trim().split(/\s+/).length > 6) title += '...';
  return title;
}

// askQuestion fonksiyonu içinde, cevap geldikten sonra başlığı güncelle
window.askQuestion = function () {
  const questionInput = document.getElementById('questionInput');
  const question = questionInput.value.trim();
  if (!question) return;

  appendMessage('user', question);
  questionInput.value = '';

  hideStartPrompt();

  const mode = document.getElementById('modeRetrieval')?.checked ? 'retrieval' : 'general';

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
        // İlk soru → Başlık için AI çağrısı yap
        currentChatId = generateChatId();

        let title = smartTitleFromMessage(question); // varsayılan
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

        // başlık güncelleme yok — sadece ilk mesajdan başlık üretiliyor
        saveChatToLocal(currentChatId, existing.title, existing.messages);
        updateHeaderTitle(existing.title);
      }

      updateChatList();
      localStorage.setItem('lastChatId', currentChatId);
      loadNotes(currentChatId);
    })
};

window.appendMessage = function (role, text) {
  const div = document.createElement('div');
  div.className = `p-2 rounded max-w-[75%] ${role === 'user' ? 'ml-auto bg-blue-100 text-right' : 'bg-gray-200 text-left'}`;
  div.textContent = text;
  const container = document.getElementById('chat-container');
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

function generateChatId() {
  return 'chat-' + Date.now();
}

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
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    headerTitle.textContent = title || 'AI Ders Asistanı';
  }
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
};

// --- Not Defteri ---

window.loadNotes = function (chatId) {
  const notes = JSON.parse(localStorage.getItem(`notes-${chatId}`)) || [];
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';

  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-yellow-100 relative';

    const textarea = document.createElement('textarea');
    textarea.value = note;
    textarea.className = 'w-full resize-none bg-yellow-100 border-none focus:outline-none';
    textarea.rows = 2;
    textarea.addEventListener('input', () => {
      notes[index] = textarea.value;
      localStorage.setItem(`notes-${chatId}`, JSON.stringify(notes));
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = '✖';
    delBtn.title = 'Notu Sil';
    delBtn.className = 'absolute top-1 right-1 text-red-600';
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
  notes.push('');
  localStorage.setItem(`notes-${currentChatId}`, JSON.stringify(notes));
  loadNotes(currentChatId);
};

function clearNotesUI() {
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';
}

function autoSaveNote(text) {
  if (!currentChatId) return;
  const notes = JSON.parse(localStorage.getItem(`notes-${currentChatId}`)) || [];
  notes.push(text);
  localStorage.setItem(`notes-${currentChatId}`, JSON.stringify(notes));
  loadNotes(currentChatId);
}
