import { db } from '$lib/server/db';
import { documents, chunks } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { chunkText } from '$lib/server/chunker';
import { getEmbeddings } from '$lib/server/embedding';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	const docs = await db
		.select()
		.from(documents)
		.where(eq(documents.userId, session.user.id))
		.orderBy(desc(documents.createdAt));

	return Response.json(docs);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) {
		return Response.json({ error: 'No file provided' }, { status: 400 });
	}

	// Limit file size to 10MB to prevent OOM on low-memory systems
	const MAX_FILE_SIZE = 10 * 1024 * 1024;
	if (file.size > MAX_FILE_SIZE) {
		return Response.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
	}

	const allowedTypes = ['text/plain', 'application/pdf'];
	if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
		return Response.json({ error: 'Only .txt and .pdf files are supported' }, { status: 400 });
	}

	let textContent: string;

	if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
		// PDF support (pdf-parse v2.x class-based API)
		try {
			const { PDFParse } = await import('pdf-parse');
			const buffer = Buffer.from(await file.arrayBuffer());
			const parser = new PDFParse({ data: buffer });
			const result = await parser.getText();
			textContent = result.text;
			await parser.destroy();
		} catch (e) {
			console.error('PDF parse error:', e);
			return Response.json({ error: 'Failed to parse PDF. Ensure pdf-parse is installed.' }, { status: 500 });
		}
	} else {
		textContent = await file.text();
	}

	if (!textContent.trim()) {
		return Response.json({ error: 'File is empty' }, { status: 400 });
	}

	// Create document record
	const [doc] = await db
		.insert(documents)
		.values({
			userId: session.user.id,
			filename: file.name,
			mimeType: file.type || 'text/plain',
			fileSize: file.size,
			status: 'processing'
		})
		.returning();

	try {
		// Chunk the text
		const textChunks = chunkText(textContent);

		// Generate embeddings in batches to limit memory usage
		const EMBED_BATCH_SIZE = 32;
		const allEmbeddings: number[][] = [];
		for (let b = 0; b < textChunks.length; b += EMBED_BATCH_SIZE) {
			const batch = textChunks.slice(b, b + EMBED_BATCH_SIZE);
			const batchEmbeddings = await getEmbeddings(batch);
			allEmbeddings.push(...batchEmbeddings);
		}

		// Batch insert chunks (instead of one-at-a-time N+1 queries)
		const INSERT_BATCH_SIZE = 50;
		for (let b = 0; b < textChunks.length; b += INSERT_BATCH_SIZE) {
			const batchValues = [];
			const end = Math.min(b + INSERT_BATCH_SIZE, textChunks.length);
			for (let i = b; i < end; i++) {
				batchValues.push({
					documentId: doc.id,
					content: textChunks[i],
					chunkIndex: i,
					embedding: allEmbeddings[i],
					metadata: { charStart: i * 450, charEnd: Math.min((i + 1) * 500, textContent.length) }
				});
			}
			await db.insert(chunks).values(batchValues);
		}

		// Update document status
		await db
			.update(documents)
			.set({ status: 'ready', chunkCount: textChunks.length })
			.where(eq(documents.id, doc.id));

		const [updatedDoc] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, doc.id));

		return Response.json(updatedDoc, { status: 201 });
	} catch (error) {
		await db
			.update(documents)
			.set({ status: 'error' })
			.where(eq(documents.id, doc.id));

		console.error('Document ingestion error:', error);
		return Response.json({ error: 'Failed to process document' }, { status: 500 });
	}
};
