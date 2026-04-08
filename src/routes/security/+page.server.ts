import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	if (!session?.user?.id) {
		return { logs: [] };
	}

	const logs = await db
		.select()
		.from(auditLogs)
		.where(eq(auditLogs.userId, session.user.id))
		.orderBy(desc(auditLogs.createdAt))
		.limit(50);

	return {
		logs: logs.map((log) => ({
			id: log.id,
			action: log.action,
			detail: log.detail,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			createdAt: log.createdAt.toISOString()
		}))
	};
};
