import * as cheerio from "cheerio";
import { GoogleGenAI, type ContentEmbedding } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

type VectorPayload = {
	chunk: string;
	source: string;
};

type Point = {
	id: number;
	vector: number[];
	payload: VectorPayload;
};

async function scrapeText(url: string): Promise<string> {
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`);
		}
		const html = await res.text();
		const $ = cheerio.load(html);
		$("script, style").remove();
		return $("body").text().replace(/\s\s+/g, " ").trim();
	} catch (error) {
		console.error(`Failed to scrape ${url}`, error);
		return "";
	}
}

async function main() {
	const urls = [
		"https://learn.utcode.net/docs/browser-apps/reference/",
		"https://learn.utcode.net/docs/browser-apps/class/",
		"https://learn.utcode.net/docs/browser-apps/anonymous-function/",
		"https://learn.utcode.net/docs/browser-apps/css-arrangement/",
	];
	const collectionName = "utcode_learn";
	const vectorSize = 768;
	const batchSize = 100;

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		console.error("GEMINI_API_KEY is required");
		process.exit(1);
	}

	const qdrantClient = new QdrantClient({
		url: "http://localhost:6333",
	});
	const gemini = new GoogleGenAI({
		apiKey: geminiApiKey,
	});
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: 256,
		chunkOverlap: 20,
	});

	try {
		await qdrantClient.recreateCollection(collectionName, {
			vectors: {
				size: vectorSize,
				distance: "Dot",
			},
		});
		console.log(`Successfully created collection: ${collectionName}`);
	} catch (error) {
		console.error(`Failed to create collection: ${collectionName}`);
		return;
	}

	let pointId = 0;
	const allPoints: Point[] = [];

	for (const url of urls) {
		console.log(`Processing URL: ${url}`);
		let scrapedText = "";
		let contents: string[] = [];

		try {
			scrapedText = await scrapeText(url);
			if (!scrapeText) {
				console.log(`Warning: No content scraped from ${url}`);
				process.exit(1)
			}
		} catch (error) {
			console.error(`Failed to scrape ${url}`);
			process.exit(1)
		}

		try {
			contents = await textSplitter.splitText(scrapedText);
			if (!contents) {
				console.error(`Failed to create chunks from ${url}`);
				process.exit(1)
			}
		} catch (error) {
			console.error(`Failed to split text from ${url}`);
			process.exit(1)
		}

		const embeddings: ContentEmbedding[] = [];
		try {
			for (let i = 0; i < contents.length; i += batchSize) {
				const batch = contents.slice(i, i + batchSize);
				const result = await gemini.models.embedContent({
					model: "gemini-embedding-001",
					contents: batch,
					config: {
						outputDimensionality: vectorSize
					}
				});
				if (result.embeddings) {
					embeddings.push(...result.embeddings);
				} else {
					console.error(
						`Warning: No embeddings returned for batch starting at index ${i}`,
					);
				}
				// Add a delay to avoid hitting the rate limit
				await new Promise((resolve) => setTimeout(resolve, 20000));
			}
		} catch (error) {
			console.error(`Failed to generate embeddings for ${url}: ${error}`);
			process.exit(1)
		}

		for (let i = 0; i < contents.length; i++) {
			const values = embeddings[i]?.values;
			const content = contents[i];
			if (values && content) {
				allPoints.push({
					id: pointId,
					vector: values,
					payload: {
						chunk: content,
						source: url,
					},
				});
			}
			pointId += 1;
		}
	}
	try {
		const operationInfo = await qdrantClient.upsert(collectionName, {
			wait: true,
			points: allPoints,
		});
		console.log(`Successfully uploaded: ${JSON.stringify(operationInfo)}`);
	} catch (error) {
		console.error("Failed to upload points", error);
	}
}

main();
