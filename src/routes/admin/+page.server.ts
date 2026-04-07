import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq, desc, count, gt } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
		return { users: [], stats: { totalUsers: 0, totalSessions: 0 } };
	}

	const allUsers = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			emailVerified: users.emailVerified,
			active: users.active,
			role: users.role,
			image: users.image,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(desc(users.createdAt));

	const [{ value: totalUsers }] = await db.select({ value: count() }).from(users);
	// Only count non-expired sessions
	const [{ value: totalSessions }] = await db
		.select({ value: count() })
		.from(sessions)
		.where(gt(sessions.expires, new Date()));

	return {
		users: allUsers.map((u) => ({
			...u,
			emailVerified: !!u.emailVerified,
			createdAt: u.createdAt?.toISOString() ?? null
		})),
		stats: {
			totalUsers,
			totalSessions
		}
	};
};

export const actions: Actions = {
	deleteUser: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: 'Not authenticated.' });
		if ((session.user as { role?: string }).role !== 'admin') return fail(403, { error: 'Admin access required.' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { error: 'User ID is required.' });
		if (userId === session.user.id) return fail(400, { error: 'You cannot delete yourself.' });

		await db.delete(sessions).where(eq(sessions.userId, userId));
		await db.delete(users).where(eq(users.id, userId));

		return { success: true };
	},

	toggleActive: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: 'Not authenticated.' });
		if ((session.user as { role?: string }).role !== 'admin') return fail(403, { error: 'Admin access required.' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { error: 'User ID is required.' });
		if (userId === session.user.id) return fail(400, { error: 'You cannot disable yourself.' });

		const user = await db.query.users.findFirst({
			where: eq(users.id, userId)
		});

		if (!user) return fail(404, { error: 'User not found.' });

		await db.update(users).set({ active: !user.active }).where(eq(users.id, userId));

		return { success: true };
	},

	toggleRole: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: 'Not authenticated.' });
		if ((session.user as { role?: string }).role !== 'admin') return fail(403, { error: 'Admin access required.' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { error: 'User ID is required.' });
		if (userId === session.user.id) return fail(400, { error: 'You cannot change your own role.' });

		const user = await db.query.users.findFirst({
			where: eq(users.id, userId)
		});

		if (!user) return fail(404, { error: 'User not found.' });

		const newRole = user.role === 'admin' ? 'user' : 'admin';
		await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

		return { success: true };
	}
};
