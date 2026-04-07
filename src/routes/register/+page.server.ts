import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users, sessions, verificationTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '$lib/server/email';
import { validatePassword } from '$lib/server/validation';

const isProduction = process.env.NODE_ENV === 'production';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const firstName = (formData.get('firstName') as string)?.trim();
		const lastName = (formData.get('lastName') as string)?.trim();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!firstName || !email || !password || !confirmPassword) {
			return fail(400, { error: 'First name, email, and password are required.' });
		}

		if (firstName.length > 50 || (lastName && lastName.length > 50)) {
			return fail(400, { error: 'Name must be 50 characters or less.' });
		}

		const name = lastName ? `${firstName} ${lastName}` : firstName;

		const passwordError = validatePassword(password);
		if (passwordError) {
			return fail(400, { error: passwordError });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match.' });
		}

		const existingUser = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (existingUser) {
			// Generic message to prevent email enumeration
			return fail(400, { error: 'Unable to create account. Please try a different email or sign in.' });
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const [newUser] = await db
			.insert(users)
			.values({
				name,
				firstName,
				lastName: lastName || null,
				email,
				password: hashedPassword,
				role: 'user'
			})
			.returning();

		const sessionToken = crypto.randomUUID();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await db.insert(sessions).values({
			sessionToken,
			userId: newUser.id,
			expires
		});

		cookies.set('authjs.session-token', sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: isProduction,
			maxAge: 30 * 24 * 60 * 60
		});

		const verificationToken = crypto.randomUUID();
		const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

		await db.insert(verificationTokens).values({
			identifier: email,
			token: verificationToken,
			expires: tokenExpires
		});

		try {
			await sendVerificationEmail(email, verificationToken, url.origin);
		} catch (e) {
			console.error('Failed to send verification email:', e);
		}

		throw redirect(303, '/dashboard?toast=register');
	}
};
