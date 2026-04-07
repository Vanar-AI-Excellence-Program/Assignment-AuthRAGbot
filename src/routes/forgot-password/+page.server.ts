import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users, verificationTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendPasswordResetEmail } from '$lib/server/email';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Email is required.' });
		}

		// Always return success to prevent email enumeration attacks
		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (user && user.password) {
			// Generate reset token
			const token = crypto.randomUUID();
			const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

			// Remove any existing tokens for this email
			await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

			// Store new token
			await db.insert(verificationTokens).values({
				identifier: email,
				token,
				expires
			});

			const resetLink = `${url.origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

			try {
				await sendPasswordResetEmail(email, resetLink);
			} catch (e) {
				console.error('Failed to send reset email:', e);
			}
		}

		// Same response regardless of whether user exists (prevents enumeration)
		return { success: true };
	}
};
