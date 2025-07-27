from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

def process_document(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)

    return docs

file_path = os.path.join(os.path.dirname(__file__), "donanim.pdf")

try:
    chunks = process_document(file_path)
    print(f"Toplamda {len(chunks)} parça oluşturuldu.")
    print("\n--- İlk Parça ---")
    print(chunks[0].page_content)
    print("\n--- Son Parça ---")
    print(chunks[-1].page_content)

except FileNotFoundError:
    print(f"Hata: {file_path} dosyası bulunamadı. Lütfen dosya yolunu kontrol edin.")
except Exception as e:
    print(f"Bir hata oluştu: {e}")