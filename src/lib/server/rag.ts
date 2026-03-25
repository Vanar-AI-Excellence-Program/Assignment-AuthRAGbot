import { db } from './db';
import { getEmbedding } from './embedding';
import { sql } from 'drizzle-orm';

export type RetrievedChunk = {
	id: string;
	content: string;
	documentId: string;
	filename: string;
	chunkIndex: number;
	similarity: number;
	metadata: unknown;
};

export async function retrieveRelevantChunks(
	query: string,
	userId: string,
	topK = 5,
	threshold = 0.3
): Promise<RetrievedChunk[]> {
	const queryEmbedding = await getEmbedding(query);
	const vectorStr = `[${queryEmbedding.join(',')}]`;

	const results = await db.execute<Record<string, unknown>>(sql`
		SELECT
			c.id,
			c.content,
			c.document_id AS "documentId",
			c.chunk_index AS "chunkIndex",
			c.metadata,
			d.filename,
			1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
		FROM chunks c
		JOIN documents d ON d.id = c.document_id
		WHERE d.status = 'ready' AND d.user_id = ${userId}
		ORDER BY c.embedding <=> ${vectorStr}::vector
		LIMIT ${topK}
	`);

	// db.execute returns RowList (array-like) with postgres-js driver
	const rows = Array.from(results) as unknown as RetrievedChunk[];
	return rows.filter((r) => Number(r.similarity) >= threshold);
}

export async function retrieveChunksByFilename(
	query: string,
	filename: string,
	userId: string,
	topK = 5
): Promise<RetrievedChunk[]> {
	const queryEmbedding = await getEmbedding(query);
	const vectorStr = `[${queryEmbedding.join(',')}]`;

	const results = await db.execute<Record<string, unknown>>(sql`
		SELECT
			c.id,
			c.content,
			c.document_id AS "documentId",
			c.chunk_index AS "chunkIndex",
			c.metadata,
			d.filename,
			1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
		FROM chunks c
		JOIN documents d ON d.id = c.document_id
		WHERE d.status = 'ready' AND d.filename = ${filename} AND d.user_id = ${userId}
		ORDER BY c.embedding <=> ${vectorStr}::vector
		LIMIT ${topK}
	`);

	return Array.from(results) as unknown as RetrievedChunk[];
}

export function buildContextPrompt(chunks: RetrievedChunk[]): string {
	if (chunks.length === 0) return '';

	const contextBlocks = chunks
		.map(
			(c, i) =>
				`[Source ${i + 1}: ${c.filename}, Chunk ${c.chunkIndex + 1}]\n${c.content}`
		)
		.join('\n\n---\n\n');

	return `\n\n## Retrieved Knowledge Base Context
The following excerpts from uploaded documents may be relevant to the user's question.

IMPORTANT RULES FOR USING SOURCES:
- ONLY use and cite these sources if the user's question is clearly about or related to the content in these documents.
- If the user is making casual conversation, asking general knowledge questions, or anything NOT related to the uploaded documents, completely IGNORE these sources and respond normally without any [Source N] citations.
- When you DO use information from the sources, cite them using [Source 1], [Source 2], etc. notation inline in your response.
- Do NOT mention or reference sources if you are not using them.

---

${contextBlocks}

---`;
}
