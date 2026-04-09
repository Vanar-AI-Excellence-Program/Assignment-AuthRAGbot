import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { documents } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit, requestMeta } from '$lib/server/audit';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	const [doc] = await db
		.select()
		.from(documents)
		.where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)));

	if (!doc) {
		return Response.json({ error: 'Document not found' }, { status: 404 });
	}

	return Response.json(doc);
};

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	const [doc] = await db
		.select()
		.from(documents)
		.where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)));

	if (!doc) {
		return Response.json({ error: 'Document not found' }, { status: 404 });
	}

	await db.delete(documents).where(eq(documents.id, params.id));

	logAudit({
		userId: session.user.id,
		action: 'document_deleted',
		detail: `Deleted "${doc.filename}"`,
		...requestMeta(request)
	});

	return Response.json({ success: true });
};
