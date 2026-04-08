<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const headingText = 'Secure Authentication';
	const subtitleText = 'Protect your users with enterprise-grade security. Email sign-up, encrypted passwords, and persistent database sessions.';

	// Typewriter state — start with full text for SSR (good LCP), animate on client
	let mounted = $state(false);
	let typedHeading = $state(headingText);
	let headingDone = $state(true);

	let typedSubtitle = $state(subtitleText);
	let subtitleDone = $state(true);

	$effect(() => {
		if (mounted) return;
		mounted = true;
		typedHeading = '';
		headingDone = false;
		typedSubtitle = '';
		subtitleDone = false;
	});

	$effect(() => {
		if (!mounted || headingDone) return;
		let i = 0;
		const interval = setInterval(() => {
			if (i < headingText.length) {
				typedHeading = headingText.slice(0, i + 1);
				i++;
			} else {
				clearInterval(interval);
				headingDone = true;
			}
		}, 45);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!headingDone || subtitleDone) return;
		let i = 0;
		const interval = setInterval(() => {
			if (i < subtitleText.length) {
				typedSubtitle = subtitleText.slice(0, i + 1);
				i++;
			} else {
				clearInterval(interval);
				subtitleDone = true;
			}
		}, 20);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Passly - Secure Authentication Platform</title>
	<meta name="description" content="Enterprise-grade authentication platform with email verification, OAuth, encrypted passwords, and AI-powered document chat." />
</svelte:head>

<!-- ═══════════════════════════════════════════════
     HERO SECTION
     ═══════════════════════════════════════════════ -->
<section class="relative overflow-hidden">
	<!-- Background pattern -->
	<div class="absolute inset-0 -z-20 opacity-[0.03] dark:opacity-[0.06]">
		<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
					<circle cx="20" cy="20" r="1" fill="#6366f1" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#grid)" />
		</svg>
	</div>

	<!-- Gradient blobs — reduced blur for low-end compositing -->
	<div class="absolute inset-0 -z-10" aria-hidden="true">
		<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 rounded-full blur-2xl opacity-50 -translate-y-1/2 will-change-transform"></div>
		<div class="absolute bottom-0 right-0 w-[350px] h-[350px] bg-gradient-to-tl from-blue-100 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-full blur-2xl opacity-30 translate-y-1/2 will-change-transform"></div>
	</div>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center py-16 sm:py-20">
			<!-- Badge -->
			<div class="animate-slide-up mb-6">
				<span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
					<span class="relative flex h-2 w-2">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
					</span>
					Open Source Authentication Platform
				</span>
			</div>

			<!-- Heading with typewriter -->
			<h1 class="animate-slide-up cursor-default text-5xl font-extrabold text-gray-900 dark:text-white sm:text-7xl tracking-tight relative">
				<span class="invisible select-none" aria-hidden="true">Secure <span>Authentication</span></span>
				<span class="absolute inset-0">
					{#if typedHeading.length <= 7}
						{typedHeading}
					{:else}
						{typedHeading.slice(0, 7)}<span class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">{typedHeading.slice(7)}</span>
					{/if}
				</span>
			</h1>

			<p class="animate-slide-up cursor-default mt-6 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed relative">
				<span class="invisible select-none" aria-hidden="true">{subtitleText}</span>
				<span class="absolute inset-0">{typedSubtitle}</span>
			</p>

			<!-- CTA Buttons -->
			<div class="animate-slide-up-delay-1 mt-10 flex flex-col sm:flex-row items-center gap-4">
				<a
					href={data.session?.user ? '/dashboard' : '/register'}
					class="group relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
				>
					{data.session?.user ? 'Go to Dashboard' : 'Get Started Free'}
					<svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
				<a
					href="#features"
					class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-7 py-3.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:-translate-y-0.5 bg-white/60 dark:bg-gray-800/60"
				>
					Learn More
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</a>
			</div>

			<!-- Trust stats -->
			<div class="animate-slide-up-delay-2 mt-14 flex items-center gap-8 sm:gap-12">
				<div class="text-center">
					<p class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">256-bit</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Encryption</p>
				</div>
				<div class="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
				<div class="text-center">
					<p class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">OAuth 2.0</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Google & GitHub</p>
				</div>
				<div class="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
				<div class="text-center">
					<p class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">TOTP</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Email Verification</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float hidden sm:block">
		<div class="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-start justify-center p-1.5">
			<div class="w-1.5 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     ROLE SELECTION
     ═══════════════════════════════════════════════ -->
<section class="relative py-16 sm:py-20">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-10">
			<p class="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-2">Quick Access</p>
			<h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Choose your portal</h2>
			<p class="mt-3 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">Sign in to your account or access the admin panel to manage your platform.</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
			<!-- User Card -->
			<a
				href={data.session?.user && data.role === 'user' ? '/dashboard' : '/login?role=user'}
				class="group relative bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-7 text-left transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
			>
				<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 dark:from-indigo-950/30 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
				<div class="relative">
					<div class="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 group-hover:scale-110 transition-transform">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<h3 class="text-xl font-bold text-gray-900 dark:text-white">Login as User</h3>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in or register as a regular user to access your personal dashboard.</p>
					<span class="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
						{data.session?.user && data.role === 'user' ? 'Go to Dashboard' : 'Login / Register'}
						<span class="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
					</span>
				</div>
			</a>

			<!-- Admin Card -->
			<a
				href={data.session?.user && data.role === 'admin' ? '/admin' : '/login?role=admin'}
				class="group relative bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 rounded-2xl p-7 text-left transition-all hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1"
			>
				<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-50 dark:from-purple-950/30 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
				<div class="relative">
					<div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-purple-200 dark:shadow-purple-900/40 group-hover:scale-110 transition-transform">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<h3 class="text-xl font-bold text-gray-900 dark:text-white">Admin Login</h3>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in to the admin panel to manage users and system settings.</p>
					<span class="mt-4 inline-flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
						{data.session?.user && data.role === 'admin' ? 'Go to Admin Panel' : 'Admin Login'}
						<span class="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
					</span>
				</div>
			</a>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     FEATURES SECTION
     ═══════════════════════════════════════════════ -->
<section id="features" class="relative py-16 sm:py-24 bg-gray-50/80 dark:bg-gray-900/50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-14">
			<p class="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-2">Features</p>
			<h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Everything you need for secure auth</h2>
			<p class="mt-3 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Built with modern best practices and battle-tested technologies to keep your users safe.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Feature 1 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">User Management</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Complete account lifecycle from sign-up to session management. Profile editing, role-based access, and account deactivation.</p>
			</div>

			<!-- Feature 2 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Encrypted Passwords</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Passwords hashed with bcrypt (12 rounds). HttpOnly cookies, database-backed sessions, and CSRF-protected routes.</p>
			</div>

			<!-- Feature 3 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Email Verification</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">TOTP-based 6-digit code verification via email. Time-limited codes with automatic expiry and one-click resend.</p>
			</div>

			<!-- Feature 4 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">AI Document Chat</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Upload documents and chat with Pascal, your AI assistant. RAG-powered answers with source citations from your own files.</p>
			</div>

			<!-- Feature 5 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-sky-100 dark:bg-sky-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">OAuth Integration</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">One-click sign-in with Google and GitHub. Automatic account linking and seamless social authentication flow.</p>
			</div>

			<!-- Feature 6 -->
			<div class="group bg-white dark:bg-gray-800/80 p-7 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 transition-all hover:shadow-lg hover:-translate-y-1">
				<div class="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Built for Speed</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Powered by SvelteKit with instant page transitions. Drizzle ORM for type-safe queries and pgvector for fast semantic search.</p>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     HOW IT WORKS
     ═══════════════════════════════════════════════ -->
<section class="py-16 sm:py-24">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-14">
			<p class="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-2">How it works</p>
			<h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Up and running in minutes</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
			<!-- Step 1 -->
			<div class="text-center">
				<div class="relative mx-auto w-16 h-16 mb-5">
					<div class="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl rotate-6"></div>
					<div class="relative w-full h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
						<span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">1</span>
					</div>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Create Account</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign up with email and password or use Google/GitHub for instant access.</p>
			</div>

			<!-- Step 2 -->
			<div class="text-center">
				<div class="relative mx-auto w-16 h-16 mb-5">
					<div class="absolute inset-0 bg-purple-100 dark:bg-purple-900/40 rounded-2xl rotate-6"></div>
					<div class="relative w-full h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
						<span class="text-2xl font-bold text-purple-600 dark:text-purple-400">2</span>
					</div>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Verify Email</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Enter the 6-digit code sent to your inbox to verify your identity.</p>
			</div>

			<!-- Step 3 -->
			<div class="text-center">
				<div class="relative mx-auto w-16 h-16 mb-5">
					<div class="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl rotate-6"></div>
					<div class="relative w-full h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
						<span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">3</span>
					</div>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white">Start Building</h3>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Access your dashboard, upload documents, and chat with Pascal AI.</p>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     TECH STACK
     ═══════════════════════════════════════════════ -->
<section class="py-16 sm:py-20 bg-gray-50/80 dark:bg-gray-900/50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-10">
			<p class="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-2">Tech Stack</p>
			<h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Built with modern technologies</h2>
		</div>

		<div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 max-w-3xl mx-auto">
			{#each [
				{ name: 'SvelteKit', color: 'text-orange-500' },
				{ name: 'TypeScript', color: 'text-blue-500' },
				{ name: 'PostgreSQL', color: 'text-sky-600' },
				{ name: 'Drizzle ORM', color: 'text-emerald-500' },
				{ name: 'Auth.js', color: 'text-purple-500' },
				{ name: 'Tailwind CSS', color: 'text-cyan-500' },
				{ name: 'Google Gemini', color: 'text-blue-400' },
				{ name: 'pgvector', color: 'text-indigo-500' }
			] as tech}
				<span class="text-sm font-semibold {tech.color} dark:opacity-90 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
					{tech.name}
				</span>
			{/each}
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     FINAL CTA
     ═══════════════════════════════════════════════ -->
<section class="py-16 sm:py-24">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 dark:from-black dark:via-indigo-950 dark:to-black p-10 sm:p-16 text-center shadow-2xl">
			<!-- Decorative -->
			<div class="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
			<div class="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl"></div>

			<div class="relative">
				<h2 class="text-3xl sm:text-4xl font-bold text-white">Ready to get started?</h2>
				<p class="mt-4 text-lg text-gray-300 max-w-xl mx-auto">Create your account in seconds and experience secure, modern authentication.</p>
				<div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
					<a
						href={data.session?.user ? '/dashboard' : '/register'}
						class="group inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-7 py-3.5 rounded-xl text-sm transition-all hover:bg-gray-100 shadow-lg hover:-translate-y-0.5"
					>
						{data.session?.user ? 'Go to Dashboard' : 'Create Free Account'}
						<svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>
					{#if !data.session?.user}
						<a
							href="/login"
							class="inline-flex items-center gap-2 text-gray-300 hover:text-white font-medium px-7 py-3.5 rounded-xl text-sm border border-white/20 hover:border-white/40 transition-all hover:-translate-y-0.5"
						>
							Sign in to existing account
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════
     FOOTER
     ═══════════════════════════════════════════════ -->
<footer class="border-t border-gray-200 dark:border-gray-800 py-10">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" />
				</svg>
				<span class="text-sm font-medium">Passly</span>
			</div>
			<div class="flex items-center gap-6">
				<a href="/dashboard" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</a>
				<a href="/chat" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Pascal AI</a>
				<a href="/profile" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Profile</a>
			</div>
			<p class="text-xs text-gray-400 dark:text-gray-500">Built with SvelteKit & Auth.js</p>
		</div>
	</div>
</footer>
