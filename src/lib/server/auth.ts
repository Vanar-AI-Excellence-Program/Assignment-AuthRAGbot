import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import GitHub from '@auth/core/providers/github';
import Credentials from '@auth/core/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { users, sessions, accounts, verificationTokens } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logAudit } from './audit';

// Holds request metadata for the current OAuth callback so the
// signIn event (which has no access to the request) can log it.
let _oauthRequestMeta: { ipAddress: string | null; userAgent: string | null } = {
	ipAddress: null,
	userAgent: null
};

/** Called from hooks.server.ts before the auth handle runs. */
export function captureRequestMeta(request: Request, getClientAddress?: () => string) {
	let ip =
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		null;

	if (!ip && getClientAddress) {
		try { ip = getClientAddress(); } catch {}
	}

	if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
	else if (ip?.startsWith('::ffff:')) ip = ip.slice(7);

	_oauthRequestMeta = {
		ipAddress: ip,
		userAgent: request.headers.get('user-agent') || null
	};
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		sessionsTable: sessions,
		accountsTable: accounts,
		verificationTokensTable: verificationTokens
	}),
	session: {
		strategy: 'database',
		maxAge: 30 * 24 * 60 * 60 // 30 days
	},
	providers: [
		Google,
		GitHub,
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;

				const email = credentials.email as string;
				const password = credentials.password as string;

				const user = await db.query.users.findFirst({
					where: eq(users.email, email)
				});

				if (!user || !user.password) return null;

				const isValid = await bcrypt.compare(password, user.password);
				if (!isValid) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				};
			}
		})
	],
	callbacks: {
		async session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;

				const dbUser = await db.query.users.findFirst({
					where: eq(users.id, user.id)
				});
				session.user.role = dbUser?.role ?? 'user';
			}
			return session;
		},
		async signIn({ user, account }) {
			if (user?.id) {
				const dbUser = await db.query.users.findFirst({
					where: eq(users.id, user.id)
				});
				if (dbUser && !dbUser.active) {
					return false;
				}
			}

			// Log OAuth sign-ins (credentials logins are logged in the login route)
			if (account?.provider && account.provider !== 'credentials' && user?.id) {
				const provider = account.provider.charAt(0).toUpperCase() + account.provider.slice(1);
				await logAudit({
					userId: user.id,
					action: 'login',
					detail: `Signed in with ${provider}`,
					..._oauthRequestMeta
				});
			}

			return true;
		},
		async redirect({ url, baseUrl }) {
			if (url.startsWith('/')) return `${baseUrl}${url}`;
			if (url.startsWith(baseUrl)) return url;
			return baseUrl;
		}
	},
	pages: {
		signIn: '/login'
	},
	trustHost: true
});
