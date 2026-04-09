import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';

export type AuditAction =
	| 'login'
	| 'login_failed'
	| 'logout'
	| 'register'
	| 'email_verified'
	| 'profile_updated'
	| 'password_changed'
	| 'password_reset_requested'
	| 'password_reset_completed'
	| 'account_deactivated'
	| 'account_activated'
	| 'account_deleted'
	| 'role_changed'
	| 'document_uploaded'
	| 'document_deleted';

interface AuditEntry {
	userId?: string | null;
	action: AuditAction;
	detail?: string;
	ipAddress?: string | null;
	userAgent?: string | null;
}

/**
 * Write an audit log entry. Returns a promise so callers can optionally
 * await it (e.g. before a redirect). Safe to call without awaiting too.
 */
export function logAudit(entry: AuditEntry): Promise<void> {
	return db
		.insert(auditLogs)
		.values({
			userId: entry.userId ?? null,
			action: entry.action,
			detail: entry.detail ?? null,
			ipAddress: entry.ipAddress ?? null,
			userAgent: entry.userAgent ?? null
		})
		.then(() => {})
		.catch((err) => console.error('Audit log write failed:', err));
}

/**
 * Extract IP and user-agent from a SvelteKit request event.
 * Pass `getClientAddress` from the event for a reliable IP fallback
 * when there are no proxy headers (e.g. local development).
 */
export function requestMeta(request: Request, getClientAddress?: () => string) {
	let ip =
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		null;

	if (!ip && getClientAddress) {
		try {
			ip = getClientAddress();
		} catch {
			// getClientAddress can throw in some adapters
		}
	}

	// Normalize IPv6 loopback to IPv4 for readability
	if (ip === '::1' || ip === '::ffff:127.0.0.1') {
		ip = '127.0.0.1';
	} else if (ip?.startsWith('::ffff:')) {
		ip = ip.slice(7);
	}

	return {
		ipAddress: ip,
		userAgent: request.headers.get('user-agent') || null
	};
}
