# ![alt text](logo.ico) ILTEACH: Interactive Lesson Teaching

**ILTEACH**, öğrencilerin kendi yüklediği içeriklerden öğrenebileceği etkileşimli bir yapay zekâ asistanıdır.  

🌟 Temel fikir:  

---

## 🌱 Proje Amacı

Bu proje, **sohbet tabanlı öğrenme yönteminin verimliliğini** artırmak amacıyla geliştirilmiştir. Öğrenciler:

- Kendi PDF ders notlarını yükleyerek
- Konu üzerinde sorular sorabilir
- Karmaşık konuları sadeleştirilmiş şekilde öğrenebilir
- Soru sorarak, tekrar ederek, açıklamalar alarak daha aktif öğrenme deneyimi yaşar

---

## 📜 Kullanılan Teknolojiler

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **AI Motoru** | `Gemini API (gemini-1.5-flash)` | Google'ın büyük dil modeli, sohbet ve içerik üretimi |
| **Veri İşleme** | `LangChain` | Doküman yükleme, parçalama, embedding ve retrieval chain |
| **Embedding** | `GoogleGenerativeAIEmbeddings` | Dokümanları vektörel olarak anlamlandırma |
| **Vector Store** | `FAISS` | Hızlı ve lokal belge arama motoru |
| **Frontend** | `HTML`, `Tailwind CSS`, `Vanilla JS` | Minimal, responsive ve interaktif arayüz |
| **Backend** | `Python`, `Flask` | API sunucusu, belge işleme, sohbet entegrasyonu |
| **Yardımcılar** | `dotenv`, `PyPDFLoader` | .env yönetimi ve PDF parçalama |

---

## ✨ Başlangıç (Local Çalıştırma)

```bash
git clone https://github.com/kullanici/ilteach.git
cd ilteach
pip install -r requirements.txt

# .env dosyasına Google API key ekleyin
echo "GOOGLE_API_KEY=YOUR_API_KEY_HERE" > .env

# Uygulamayı başlatın
python app.py
```

## 👾 Mine Büşra HAZER

**Projeyi daha detaylı anlattığım Medium yazımı incelemek isterseniz:**

[Sohbet Ederek Öğrenmenin Gücü: ILTeach ile Etkileşimli Ders Deneyimi](https://medium.com/@busrahazer/sohbet-ederek-%C3%B6%C4%9Frenmenin-g%C3%BCc%C3%BC-ilteach-ile-etkile%C5%9Fimli-ders-deneyimi-b9522711ac91)