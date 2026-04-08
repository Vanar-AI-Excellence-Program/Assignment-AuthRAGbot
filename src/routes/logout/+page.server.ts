import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit, requestMeta } from '$lib/server/audit';

export const actions: Actions = {
	default: async ({ cookies, locals, request, getClientAddress }) => {
		const session = await locals.auth();

		if (session?.user?.id) {
			const meta = requestMeta(request, getClientAddress);
			await logAudit({ userId: session.user.id, action: 'logout', ...meta });
			// Delete all sessions for this user
			await db.delete(sessions).where(eq(sessions.userId, session.user.id));
		} else {
			// Fallback: try deleting by session token
			const sessionToken =
				cookies.get('authjs.session-token') ||
				cookies.get('__Secure-authjs.session-token');

			if (sessionToken) {
				await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
			}
		}

		// Clear both possible cookie names
		cookies.delete('authjs.session-token', { path: '/' });
		cookies.delete('__Secure-authjs.session-token', { path: '/' });

		throw redirect(303, '/?toast=logout');
	}
};
