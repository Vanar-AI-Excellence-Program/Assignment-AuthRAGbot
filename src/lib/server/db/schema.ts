import { pgTable, text, timestamp, integer, primaryKey, index, boolean, jsonb, customType } from 'drizzle-orm/pg-core';

// Custom pgvector type for 384-dimensional embeddings
const vector = customType<{ data: number[]; driverParam: string }>({
	dataType() {
		return 'vector(384)';
	},
	toDriver(value: number[]): string {
		return `[${value.join(',')}]`;
	},
	fromDriver(value: unknown): number[] {
		if (typeof value === 'string') {
			return value.replace(/[\[\]]/g, '').split(',').map(Number);
		}
		return value as number[];
	}
});

// ─── Auth Tables ───────────────────────────────────────────────

export const users = pgTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	firstName: text('first_name'),
	lastName: text('last_name'),
	email: text('email').unique().notNull(),
	emailVerified: timestamp('email_verified', { mode: 'date' }),
	image: text('image'),
	password: text('password'),
	phone: text('phone'),
	bio: text('bio'),
	location: text('location'),
	active: boolean('active').default(true).notNull(),
	role: text('role').default('user').notNull(),
	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow()
});

export const accounts = pgTable(
	'accounts',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('provider_account_id').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId]
		})
	})
);

export const sessions = pgTable(
	'sessions',
	{
		sessionToken: text('session_token').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => ({
		userIdIdx: index('sessions_user_id_idx').on(table.userId)
	})
);

export const verificationTokens = pgTable(
	'verification_tokens',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(vt) => ({
		compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
		identifierIdx: index('vt_identifier_idx').on(vt.identifier)
	})
);

// ─── Audit Log Table ──────────────────────────────────────────

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		detail: text('detail'),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
		createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
	})
);

// ─── Conversation / Chat History Tables ────────────────────────

export const conversations = pgTable(
	'conversations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull().default('New Chat'),
		provider: text('provider').notNull().default('gemini'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow()
	},
	(table) => ({
		userIdIdx: index('conversations_user_id_idx').on(table.userId)
	})
);

export const messages = pgTable(
	'messages',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: text('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		parentId: text('parent_id'),
		role: text('role').notNull(),
		content: text('content').notNull(),
		citations: jsonb('citations'),
		attachedFile: jsonb('attached_file'),
		activeChildIndex: integer('active_child_index').default(0).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow()
	},
	(table) => ({
		conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
		parentIdIdx: index('messages_parent_id_idx').on(table.parentId)
	})
);

// ─── RAG / Document Tables ─────────────────────────────────────

export const documents = pgTable(
	'documents',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(),
		mimeType: text('mime_type').notNull(),
		fileSize: integer('file_size').notNull(),
		chunkCount: integer('chunk_count').default(0).notNull(),
		status: text('status').notNull().default('processing'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow()
	},
	(table) => ({
		userIdIdx: index('documents_user_id_idx').on(table.userId)
	})
);

export const chunks = pgTable(
	'chunks',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		documentId: text('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		chunkIndex: integer('chunk_index').notNull(),
		embedding: vector('embedding'),
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow()
	},
	(table) => ({
		documentIdIdx: index('chunks_document_id_idx').on(table.documentId)
	})
);
