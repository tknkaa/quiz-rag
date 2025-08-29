from google import genai
from google.genai import types
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from qdrant_client.models import Distance, VectorParams
from scraper import scrape_text


def main():
    urls = ["https://learn.utcode.net/docs/browser-apps/class/"]

    scraped_text = scrape_text(urls[0])
    print(scraped_text)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=256,
        chunk_overlap=20,
        length_function=len,
    )

    vector_size = 768
    # at most 100 requests can be in one batch
    batch_size = 100
    collection_name = "utcode_learn"
    google_client = genai.Client()
    # contents = [
    #     "What is the meaning of life?",
    #     "What is the purpose of existence?",
    #     "How do I bake a cake?",
    # ]

    contents = text_splitter.split_text(scraped_text)
    print(contents)

    qdrant_client = QdrantClient(url="http://localhost:6333")
    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.DOT),
    )

    if not os.environ.get("GEMINI_API_KEY"):
        print("please set your GEMINI_API_KEY")

    embeddings = []
    for i in range(0, len(contents), batch_size):
        batch = contents[i : i + batch_size]
        result = google_client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch,
            config=types.EmbedContentConfig(output_dimensionality=vector_size),
        )
        if result.embeddings is not None:
            embeddings.extend(result.embeddings)
    points = []
    if embeddings is None:
        print("no embedding vector")
    else:
        for id in range(len(contents)):
            points.append(
                PointStruct(
                    id=id,
                    vector=embeddings[id].values or [],
                    payload={"chunk": contents[id]},
                )
            )

    operation_info = qdrant_client.upsert(
        collection_name=collection_name, wait=True, points=points
    )
    print(operation_info)


if __name__ == "__main__":
    main()
