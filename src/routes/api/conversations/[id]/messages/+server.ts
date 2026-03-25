import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { messages, conversations } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Verify conversation belongs to user
	const [convo] = await db
		.select()
		.from(conversations)
		.where(and(eq(conversations.id, params.id!), eq(conversations.userId, session.user.id)));

	if (!convo) {
		return Response.json({ error: 'Conversation not found' }, { status: 404 });
	}

	const { parentId, role, content, citations, activeChildIndex, attachedFile } = await request.json();

	const [msg] = await db
		.insert(messages)
		.values({
			conversationId: params.id!,
			parentId: parentId || null,
			role,
			content,
			citations: citations || null,
			attachedFile: attachedFile || null,
			activeChildIndex: activeChildIndex ?? 0
		})
		.returning();

	// Update conversation timestamp
	await db
		.update(conversations)
		.set({ updatedAt: new Date() })
		.where(eq(conversations.id, params.id!));

	return Response.json(msg, { status: 201 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Verify conversation belongs to user
	const [convo] = await db
		.select()
		.from(conversations)
		.where(and(eq(conversations.id, params.id!), eq(conversations.userId, session.user.id)));

	if (!convo) {
		return Response.json({ error: 'Conversation not found' }, { status: 404 });
	}

	const { messageId, content, citations } = await request.json();

	const [updated] = await db
		.update(messages)
		.set({
			content,
			citations: citations || null
		})
		.where(and(eq(messages.id, messageId), eq(messages.conversationId, params.id!)))
		.returning();

	if (!updated) {
		return Response.json({ error: 'Message not found' }, { status: 404 });
	}

	// Update conversation timestamp
	await db
		.update(conversations)
		.set({ updatedAt: new Date() })
		.where(eq(conversations.id, params.id!));

	return Response.json(updated);
};
