<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
		login:                    { label: 'Sign In',               color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',   icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
		login_failed:             { label: 'Failed Sign In',        color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',                   icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
		logout:                   { label: 'Sign Out',              color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',                  icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
		register:                 { label: 'Account Created',       color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',               icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
		email_verified:           { label: 'Email Verified',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
		profile_updated:          { label: 'Profile Updated',       color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30',       icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		password_changed:         { label: 'Password Changed',      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',          icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
		password_reset_requested: { label: 'Password Reset Requested', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',   icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
		password_reset_completed: { label: 'Password Reset',        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',          icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
		account_deactivated:      { label: 'Account Deactivated',   color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',                  icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
		account_activated:        { label: 'Account Activated',     color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
		account_deleted:          { label: 'Account Deleted',       color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',                   icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
		role_changed:             { label: 'Role Changed',          color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
		document_uploaded:        { label: 'Document Uploaded',    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30',               icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
		document_deleted:         { label: 'Document Deleted',     color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',                   icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }
	};

	function getInfo(action: string) {
		return actionLabels[action] ?? { label: action, color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
	}

	function parseBrowser(ua: string | null): { browser: string; os: string } {
		if (!ua) return { browser: 'Unknown', os: 'Unknown' };

		let browser = 'Unknown';
		if (ua.includes('Edg/'))        browser = 'Edge';
		else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
		else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
		else if (ua.includes('Firefox/')) browser = 'Firefox';
		else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
		else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

		let os = 'Unknown';
		if (ua.includes('Windows'))      os = 'Windows';
		else if (ua.includes('Mac OS'))  os = 'macOS';
		else if (ua.includes('Android')) os = 'Android';
		else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
		else if (ua.includes('Linux'))   os = 'Linux';
		else if (ua.includes('CrOS'))    os = 'ChromeOS';

		return { browser, os };
	}

	function deviceIcon(os: string): string {
		if (os === 'Android' || os === 'iOS') return 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z';
		return 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
	}

	function formatDate(iso: string) {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		const diffHr = Math.floor(diffMs / 3600000);
		const diffDay = Math.floor(diffMs / 86400000);

		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		if (diffHr < 24) return `${diffHr}h ago`;
		if (diffDay < 7) return `${diffDay}d ago`;

		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
	}

	function formatFullDate(iso: string) {
		return new Date(iso).toLocaleString('en-US', {
			weekday: 'short', month: 'short', day: 'numeric',
			year: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Security Activity - Passly</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="animate-slide-up mb-8">
		<div class="flex items-center gap-3 mb-1">
			<div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
				<svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Security Activity</h1>
				<p class="text-sm text-gray-500 dark:text-gray-400">Recent activity on your account</p>
			</div>
		</div>
	</div>

	<!-- Activity Log -->
	<div class="animate-slide-up-delay-1">
		{#if data.logs.length === 0}
			<div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
				<div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<p class="text-gray-500 dark:text-gray-400 font-medium">No activity yet</p>
				<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Your security events will appear here.</p>
			</div>
		{:else}
			<div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="divide-y divide-gray-100 dark:divide-gray-700/50">
					{#each data.logs as log}
						{@const info = getInfo(log.action)}
						{@const device = parseBrowser(log.userAgent)}
						<div class="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
							<!-- Icon -->
							<div class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 {info.color}">
								<svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={info.icon} />
								</svg>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2">
									<p class="text-sm font-semibold text-gray-900 dark:text-white">{info.label}</p>
									<time
										datetime={log.createdAt}
										title={formatFullDate(log.createdAt)}
										class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0"
									>
										{formatDate(log.createdAt)}
									</time>
								</div>

								<!-- Device & Browser -->
								<div class="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
									<span class="inline-flex items-center gap-1">
										<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={deviceIcon(device.os)} />
										</svg>
										{device.browser} on {device.os}
									</span>
									{#if log.ipAddress}
										<span class="text-gray-300 dark:text-gray-600">|</span>
										<span class="font-mono text-[11px]">{log.ipAddress}</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<p class="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">Showing last {data.logs.length} events</p>
		{/if}
	</div>

	<!-- Back link -->
	<div class="mt-6 text-center">
		<a href="/profile" class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
			&larr; Back to Profile
		</a>
	</div>
</div>
