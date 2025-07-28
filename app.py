import os
import asyncio
from flask import Flask, jsonify,render_template, request
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GooglegenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain

# --- Load to Environment Variables ---
load_dotenv()
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# Raise an error if the API key is not found
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file!")

#Set the API key as a system environment variable
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# --- Flask APP ---
app = Flask(__name__)

vector_store = None
chat_history = []

# --- Process PDF Document ---
def process_document(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)
    return chunks

# --- Create FAISS Vector Store ---
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

    embeddings = GooglegenerativeAIEmbeddings(model="models/embedding-001")

    print("[DEBUG] Embedding object created.")

    vector_store = FAISS.from_documents(text_chunks, embedding=embeddings)

    print("[DEBUG] Vector store created.")

    return vector_store

# --- Set up LLM with Retrieval Chain ---
def get_conversation_chain():
    global vector_store
    llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.3)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever()
    )
