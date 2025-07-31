document.addEventListener('DOMContentLoaded', () => {
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
    });

    function askQuestion() {
      const questionInput = document.getElementById('questionInput');
      const question = questionInput.value.trim();
      if (!question) return;

      const chatContainer = document.getElementById('chat-container');
      chatContainer.innerHTML += `<div class="text-right bg-blue-100 p-2 rounded">${question}</div>`;
      questionInput.value = '';

      const mode = document.getElementById('modeRetrieval').checked ? 'retrieval' : 'general';

      fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode })
      })
      .then(response => response.json())
      .then(data => {
        chatContainer.innerHTML += `<div class="text-left bg-gray-200 p-2 rounded">${data.answer || data.error}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      })
      .catch(error => {
        chatContainer.innerHTML += `<div class="text-left bg-red-200 p-2 rounded">Hata: ${error.message}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    }