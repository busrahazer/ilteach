import os
import asyncio
from flask import Flask, jsonify,render_template, request
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain

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
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)
    return chunks

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
        retriever=vector_store.as_retriever(kwargs={"k": 5})
    )
# --- 6. Home Page ---
@app.route('/')
def index():
    return render_template("index.html")

# --- 7. File Load and Process ---
@app.route('/upload', methods=['POST'])
@app.route('/upload', methods=['POST'])
def upload_file():
    global vector_store, chat_history

    if 'file' not in request.files:
        print("[ERROR] Dosya yüklenemedi.")
        return jsonify({'error': 'Dosya yüklenmedi'}), 400

    file = request.files['file']
    if file.filename == '':
        print("[ERROR] Dosya adı boş.")
        return jsonify({'error': 'Dosya seçilmedi'}), 400

    if not os.path.exists('uploads'):
        os.makedirs('uploads')

    file_path = os.path.join('uploads', file.filename)
    file.save(file_path)
    print(f"[DEBUG] Dosya yüklendi: {file_path}")

    try:
        chunks = process_document(file_path)
        print(f"[DEBUG] {len(chunks)} metin parçası üretildi.")

        vector_store = get_vector_store(chunks)
        print(f"[DEBUG] Vektör mağazası başarıyla oluşturuldu.")

        chat_history = []
        os.remove(file_path)
        print("[DEBUG] Geçici dosya silindi.")

        return jsonify({'message': 'Dosya başarıyla işlendi.'}), 200
    except Exception as e:
        print(f"[ERROR] İşleme hatası: {e}")
        return jsonify({'error': str(e)}), 500

# --- 8. Answer and Question Chat API ---
@app.route('/chat', methods=['POST'])
def chat():
    global vector_store, chat_history

    if vector_store is None:
        return jsonify({'error': 'Önce bir belge yüklemelisiniz.'}), 400

    data = request.get_json()
    question = data.get('question', '')

    if not question.strip():
        return jsonify({'error': 'Soru boş olamaz.'}), 400

    try:
        chain = get_conversation_chain()
        result = chain({
            "question": question,
            "chat_history": chat_history
        })
        answer = result['answer']
        chat_history.append((question, answer))
        return jsonify({'answer': answer}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 9. Start APP ---
if __name__ == '__main__':
    app.run(debug=True)
