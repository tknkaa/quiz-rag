from google import genai
from google.genai import types
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorStruct
from qdrant_client.models import Distance, VectorParams
from scraper import scrape_text


def main():
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=100,
        chunk_overlap=20,
        length_function=len,
    )

    vector_size = 768
    collection_name = "test_collection"
    google_client = genai.Client()
    contents = [
        "What is the meaning of life?",
        "What is the purpose of existence?",
        "How do I bake a cake?",
    ]
    qdrant_client = QdrantClient(url="http://localhost:6333")
    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.DOT),
    )

    if not os.environ.get("GEMINI_API_KEY"):
        print("please set your GEMINI_API_KEY")
    result = google_client.models.embed_content(
        model="gemini-embedding-001",
        contents=contents,
        config=types.EmbedContentConfig(output_dimensionality=vector_size),
    )
    points = []
    if result.embeddings is None:
        print("no embedding vector")
    else:
        for id in range(len(contents)):
            points.append(
                PointStruct(
                    id=id,
                    vector=result.embeddings[id].values or [],
                    payload={"chunk": contents[id]},
                )
            )

    operation_info = qdrant_client.upsert(
        collection_name=collection_name, wait=True, points=points
    )
    print(operation_info)


if __name__ == "__main__":
    main()
