import { handle as authHandle, captureRequestMeta } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/** Capture request metadata before Auth.js processes OAuth callbacks. */
const captureMetaHandle: Handle = async ({ event, resolve }) => {
	captureRequestMeta(event.request, event.getClientAddress);
	return resolve(event);
};

const protectedRoutes: Handle = async ({ event, resolve }) => {
	const protectedPaths = ['/dashboard', '/profile', '/chat', '/documents', '/security'];
	const adminPaths = ['/admin'];
	const isProtected = protectedPaths.some((path) => event.url.pathname.startsWith(path));
	const isAdmin = adminPaths.some((path) => event.url.pathname.startsWith(path));

	if (isProtected || isAdmin) {
		const session = await event.locals.auth();
		if (!session?.user) {
			throw redirect(303, '/login');
		}

		// Check if user account is still active
		const dbUser = await db.query.users.findFirst({
			where: eq(users.id, session.user.id!)
		});

		if (dbUser && !dbUser.active) {
			// Delete all sessions for the deactivated user
			await db.delete(sessions).where(eq(sessions.userId, dbUser.id));
			throw redirect(303, '/login?error=deactivated');
		}

		if (isAdmin && session.user.role !== 'admin') {
			throw redirect(303, '/dashboard');
		}
	}

	return resolve(event);
};

export const handle = sequence(captureMetaHandle, authHandle, protectedRoutes);
