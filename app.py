import os
import asyncio
from flask import Flask, jsonify,render_template, request
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import Document


# --- 1. Load to Environment Variables ---
load_dotenv()
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# Raise an error if the API key is not found
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file!")

#Set the API key as a system environment variable
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# --- 2. Flask APP ---
app = Flask(__name__)

vector_store = None
chat_history = []

# --- 3. Process PDF Document ---
def process_document(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
    return text_splitter.split_documents(documents)


# --- 4. Create FAISS Vector Store ---
def get_vector_store(text_chunks):
    print("[DEBUG] get_vector_store started.")

    #Create an event loop if one does not exist
    try:
        asyncio.get_running_loop()
        loop_needed = False
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop_needed = True

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    print("[DEBUG] Embedding object created.")

    vector_store = FAISS.from_documents(text_chunks, embedding=embeddings)

    print("[DEBUG] Vector store created.")

    return vector_store

# --- 5. Set up LLM with Retrieval Chain ---
def get_conversation_chain():
    global vector_store
    llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.2)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever(kwargs={"k": 10})
    )
# --- 6. Home Page ---
@app.route('/')
def index():
    return render_template("index.html")

# --- 7. File Load and Process ---
@app.route('/upload', methods=['POST'])
def upload_files():
    global vector_store, chat_history

    if 'files' not in request.files:
        return jsonify({'error': 'Dosya(lar) yüklenmedi'}), 400

    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'Hiç dosya seçilmedi'}), 400

    uploads_dir = 'uploads'
    os.makedirs(uploads_dir, exist_ok=True)

    all_docs = []

    for file in files:
        file_path = os.path.join(uploads_dir, file.filename)
        file.save(file_path)
        print(f"[DEBUG] Yüklendi: {file.filename}")

        try:
            loader = PyPDFLoader(file_path)
            raw_docs = loader.load()

            file_id = os.path.splitext(file.filename)[0]
            docs = [
                Document(page_content=d.page_content, metadata={"source": file_id})
                for d in raw_docs
            ]

            from langchain.text_splitter import RecursiveCharacterTextSplitter
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            split_docs = splitter.split_documents(docs)

            all_docs.extend(split_docs)

            os.remove(file_path)
        except Exception as e:
            return jsonify({'error': f"{file.filename} işlenemedi: {str(e)}"}), 500

    if not all_docs:
        return jsonify({'error': 'Belgelerden içerik elde edilemedi.'}), 500

    print(f"[DEBUG] Toplam {len(all_docs)} yeni parça işleniyor.")

    new_vector_store = get_vector_store(all_docs)

    # Var olan store varsa, yeni gelenle birleştir
    if vector_store:
        vector_store.merge_from(new_vector_store)
        print("[DEBUG] Yeni belgeler mevcut vector store'a eklendi.")
    else:
        vector_store = new_vector_store
        print("[DEBUG] Yeni vector store oluşturuldu.")

    chat_history = []

    return jsonify({
        'message': f'{len(files)} belge başarıyla yüklendi ve işlendi.',
        'files': [file.filename for file in files]
    }), 200

# --- 8. Answer and Question Chat API ---
@app.route('/chat', methods=['POST'])
def chat():
    global vector_store, chat_history

    data = request.get_json()
    question = data.get('question', '').strip()
    mode = data.get('mode', 'retrieval')  # <== default 'retrieval'

    if not question:
        return jsonify({'error': 'Soru boş olamaz.'}), 400

    try:
        if mode == 'retrieval':
            if vector_store is None:
                return jsonify({'error': 'Önce belge yükleyin.'}), 400

            chain = get_conversation_chain()
            result = chain({
                "question": question,
                "chat_history": chat_history
            })
            answer = result['answer']
        else:
            # Genel bilgi modu
            llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.2)
            response = llm.invoke(question)
            answer = response.content

        chat_history.append((question, answer))
        return jsonify({'answer': answer}), 200

    except Exception as e:
        return jsonify({'error': f'İşlem sırasında hata: {str(e)}'}), 500

# --- 9.  Not Alma API ---
@app.route('/take-note', methods=['POST'])
def take_note():
    global chat_history
    data = request.get_json()
    command = data.get('command', '').strip()

    if not chat_history:
        return jsonify({'error': 'Sohbet geçmişi boş, not alınacak bir şey yok.'}), 400

    # En son yapay zeka yanıtını al
    last_bot_answer = chat_history[-1][1]

    try:
        # LLM'ye not içeriğini özetlemesi için bir talimat ver
        prompt = f"""Aşağıdaki metni, bir ders notu formatında, ana fikirleri koruyarak 1-2 cümlelik kısa bir not haline getir.
        
        Metin: {last_bot_answer}
        
        Not:"""

        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.2)
        response = llm.invoke(prompt)
        note_content = response.content.strip()

        return jsonify({'noteContent': note_content}), 200

    except Exception as e:
        return jsonify({'error': f'Not alınırken hata oluştu: {str(e)}'}), 500
    
# --- 10. Chat Name ---
@app.route('/generate-title', methods=['POST'])
def generate_title():
    data = request.get_json()
    question = data.get('question', '').strip()
    answer = data.get('answer', '').strip()

    if not question or not answer:
        return jsonify({'error': 'Soru ve cevap gerekli.'}), 400

    try:
        prompt = f"""Aşağıdaki soru-cevap etkileşimine göre sohbeti temsil eden kısa ve öz bir başlık üret:

        Soru: {question}
        Cevap: {answer}

        Başlık (5-8 kelime):"""

        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.4)
        response = llm.invoke(prompt)
        title = response.content.strip().replace('"', '')

        return jsonify({'title': title}), 200

    except Exception as e:
        return jsonify({'error': f'Başlık oluşturulurken hata: {str(e)}'}), 500

# --- Start APP ---
if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)
