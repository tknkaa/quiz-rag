from google import genai
from google.genai import types
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams
from scraper import scrape_text


def main():
    urls = [
        "https://learn.utcode.net/docs/browser-apps/class/",
        "https://learn.utcode.net/docs/web-servers/linux-commands/",
    ]

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=256,
        chunk_overlap=20,
        length_function=len,
    )
    vector_size = 768
    batch_size = 100
    collection_name = "utcode_learn"

    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY environment variable is required")
        return

    try:
        google_client = genai.Client()
        qdrant_client = QdrantClient(url="http://localhost:6333")
    except Exception as e:
        print(f"Failed to initialize clients: {e}")
        return

    try:
        try:
            qdrant_client.delete_collection(collection_name)
            print(f"Deleted existing collection: {collection_name}")
        except:
            pass
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.DOT),
        )
        print(f"Created collection: {collection_name}")
    except Exception as e:
        print(f"Failed to create collection: {e}")
        return

    point_id = 0
    all_points = []

    for url in urls:
        print(f"Processing URL: {url}")

        try:
            scraped_text = scrape_text(url)
            if not scraped_text:
                print(f"Warning: No content scraped from {url}")
                continue
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            continue

        try:
            contents = text_splitter.split_text(scraped_text)
            if not contents:
                print(f"Warning: No chunks created from {url}")
                continue
            print(f"Created {len(contents)} chunks from {url}")
        except Exception as e:
            print(f"Error splitting text from {url}: {e}")
            continue

        embeddings = []
        try:
            for i in range(0, len(contents), batch_size):
                batch = contents[i : i + batch_size]
                print(
                    f"Processing batch {i//batch_size + 1}/{(len(contents)-1)//batch_size + 1}"
                )

                result = google_client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=batch,
                    config=types.EmbedContentConfig(output_dimensionality=vector_size),
                )

                if result.embeddings:
                    embeddings.extend(result.embeddings)
                else:
                    print(
                        f"Warning: No embeddings returned for batch starting at index {i}"
                    )

        except Exception as e:
            print(f"Error generating embeddings for {url}: {e}")
            continue

        if len(embeddings) != len(contents):
            print(
                f"Warning: Mismatch between chunks ({len(contents)}) and embeddings ({len(embeddings)}) for {url}"
            )
            min_length = min(len(contents), len(embeddings))
        else:
            min_length = len(contents)

        for i in range(min_length):
            if embeddings[i].values:
                all_points.append(
                    PointStruct(
                        id=point_id,
                        vector=embeddings[i].values,
                        payload={"chunk": contents[i], "source": url},
                    )
                )
                point_id += 1

    if all_points:
        try:
            print(f"Uploading {len(all_points)} points to Qdrant...")
            operation_info = qdrant_client.upsert(
                collection_name=collection_name, wait=True, points=all_points
            )
            print(f"Upload successful: {operation_info}")
        except Exception as e:
            print(f"Error uploading to Qdrant: {e}")
    else:
        print("No points to upload")


if __name__ == "__main__":
    main()
