import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("API key bulunamadı. .env dosyasını kontrol et.")
    exit()

url = f"https://generativelanguage.googleapis.com/v1/models"
headers = {"X-Goog-Api-Key": api_key}

response = requests.get(url, headers=headers)

if response.status_code != 200:
    print("Hata:", response.status_code, response.text)
else:
    models = response.json().get("models", [])
    for model in models:
        name = model.get("name")
        methods = model.get("supportedGenerationMethods", [])
        print(f"- {name} ({', '.join(methods)})")
