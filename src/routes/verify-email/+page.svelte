<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	let loading = $state(false);
	let resending = $state(false);
	let digits = $state(['', '', '', '', '', '']);
	let inputRefs: HTMLInputElement[] = [];

	const email = $derived(form?.email || data.email);

	function handleInput(index: number, event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;

		// Only allow digits
		if (value && !/^\d$/.test(value)) {
			input.value = '';
			digits[index] = '';
			return;
		}

		digits[index] = value;

		// Auto-focus next input
		if (value && index < 5) {
			inputRefs[index + 1]?.focus();
		}
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			inputRefs[index - 1]?.focus();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6);
		if (!pasted) return;

		for (let i = 0; i < 6; i++) {
			digits[i] = pasted[i] || '';
			if (inputRefs[i]) inputRefs[i].value = digits[i];
		}
		// Focus the next empty input or the last one
		const nextEmpty = digits.findIndex((d) => !d);
		inputRefs[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
	}

	const code = $derived(digits.join(''));
</script>

<svelte:head>
	<title>Email Verification - Passly</title>
</svelte:head>

<div class="animate-slide-up flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
			{#if form?.success}
				<div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h2>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Your email address has been successfully verified.</p>
				<a
					href="/dashboard"
					class="mt-6 inline-block w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
				>
					Go to Dashboard
				</a>
			{:else if data.status === 'invalid'}
				<div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Invalid Link</h2>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">This page requires a valid email parameter.</p>
				<a
					href="/"
					class="mt-6 inline-block w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
				>
					Go Home
				</a>
			{:else}
				<div class="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h2>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					We sent a 6-digit code to <span class="font-medium text-gray-700 dark:text-gray-300">{email}</span>
				</p>

				{#if form?.error}
					<div class="mt-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm rounded-lg p-3 border border-red-200 dark:border-red-800">
						{form.error}
					</div>
				{/if}

				{#if form?.resent}
					<div class="mt-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-sm rounded-lg p-3 border border-green-200 dark:border-green-800">
						A new code has been sent to your email.
					</div>
				{/if}

				<form
					method="POST"
					action="?/verify"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
					class="mt-6"
				>
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="code" value={code} />

					<!-- OTP Input -->
					<div class="flex justify-center gap-2 sm:gap-3">
						{#each digits as digit, i}
							<input
								bind:this={inputRefs[i]}
								type="text"
								inputmode="numeric"
								maxlength="1"
								value={digit}
								oninput={(e) => handleInput(i, e)}
								onkeydown={(e) => handleKeydown(i, e)}
								onpaste={handlePaste}
								class="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
								autocomplete="one-time-code"
							/>
						{/each}
					</div>

					<button
						type="submit"
						disabled={loading || code.length !== 6}
						class="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700"
					>
						{loading ? 'Verifying...' : 'Verify Email'}
					</button>
				</form>

				<div class="mt-4 flex items-center justify-center gap-1">
					<span class="text-sm text-gray-500 dark:text-gray-400">Didn't receive the code?</span>
					<form
						method="POST"
						action="?/resend"
						use:enhance={() => {
							resending = true;
							return async ({ update }) => {
								resending = false;
								await update();
							};
						}}
						class="inline"
					>
						<input type="hidden" name="email" value={email} />
						<button
							type="submit"
							disabled={resending}
							class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50"
						>
							{resending ? 'Sending...' : 'Resend'}
						</button>
					</form>
				</div>

				<p class="mt-4 text-xs text-gray-400 dark:text-gray-500">Code expires in 10 minutes</p>
			{/if}
		</div>
	</div>
</div>
