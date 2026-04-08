import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, verificationTokens } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendVerificationEmail } from '$lib/server/email';
import { logAudit, requestMeta } from '$lib/server/audit';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email');

	if (!email) {
		return { status: 'invalid' as const };
	}

	return { status: 'pending' as const, email };
};

export const actions: Actions = {
	verify: async ({ request, getClientAddress }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const code = (formData.get('code') as string)?.trim();

		if (!email || !code) {
			return fail(400, { error: 'Please enter the verification code.', email });
		}

		if (!/^\d{6}$/.test(code)) {
			return fail(400, { error: 'Please enter a valid 6-digit code.', email });
		}

		const record = await db.query.verificationTokens.findFirst({
			where: and(
				eq(verificationTokens.identifier, email),
				eq(verificationTokens.token, code)
			)
		});

		if (!record) {
			return fail(400, { error: 'Invalid verification code. Please check and try again.', email });
		}

		if (record.expires < new Date()) {
			// Delete expired token
			await db.delete(verificationTokens).where(
				and(
					eq(verificationTokens.identifier, email),
					eq(verificationTokens.token, code)
				)
			);
			return fail(400, { error: 'This code has expired. Please request a new one.', email, expired: true });
		}

		// Mark email as verified
		await db
			.update(users)
			.set({ emailVerified: new Date() })
			.where(eq(users.email, email));

		// Delete used token
		await db.delete(verificationTokens).where(
			and(
				eq(verificationTokens.identifier, email),
				eq(verificationTokens.token, code)
			)
		);

		// Log the verification
		const user = await db.query.users.findFirst({ where: eq(users.email, email) });
		if (user) {
			const meta = requestMeta(request, getClientAddress);
			logAudit({ userId: user.id, action: 'email_verified', ...meta });
		}

		return { success: true };
	},

	resend: async ({ request }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Email is required.', email });
		}

		// Check if already verified
		const dbUser = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (dbUser?.emailVerified) {
			return fail(400, { error: 'Email is already verified.', email });
		}

		// Remove existing verification tokens for this email
		await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

		// Generate new 6-digit code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		await db.insert(verificationTokens).values({
			identifier: email,
			token: verificationCode,
			expires
		});

		try {
			await sendVerificationEmail(email, verificationCode);
			return { resent: true, email };
		} catch (e) {
			console.error('Failed to send verification email:', e);
			return fail(500, { error: 'Failed to send verification email. Please try again.', email });
		}
	}
};
