from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

def get_vector_store(text_chunks):
    """
    Metin parçalarını vektörleştirir ve vektör veritabanını oluşturur.
    """
    # Gemini API'sini kullanarak metinleri sayısal vektörlere dönüştürür.
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    # Vektörleri FAISS ile bir vektör veritabanına kaydeder.
    # FAISS, yerel bellekte çalışan ve hızlı arama yapan bir kütüphanedir.
    vector_store = FAISS.from_documents(text_chunks, embedding=embeddings)

    return vector_store