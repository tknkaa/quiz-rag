from google import genai
from google.genai import types
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20,
    length_function=len,
)

client = genai.Client()

if __name__ == "__main__":
    if not os.environ.get("GEMINI_API_KEY"):
        print("please set your GEMINI_API_KEY")
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=[
            "What is the meaning of life?",
            "What is the purpose of existence?",
            "How do I bake a cake?",
        ],
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    print(result.embeddings)
