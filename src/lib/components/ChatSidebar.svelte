<script lang="ts">
	type Conversation = {
		id: string;
		title: string;
		updatedAt: string;
		provider: string;
	};

	let {
		conversations,
		currentId,
		onselect,
		onnewchat,
		ondelete,
		isOpen = $bindable(false)
	} = $props<{
		conversations: Conversation[];
		currentId: string | null;
		onselect: (id: string) => void;
		onnewchat: () => void;
		ondelete: (id: string) => void;
		isOpen: boolean;
	}>();

	let search = $state('');
	let confirmDeleteId = $state<string | null>(null);
	let hoverDeleteId = $state<string | null>(null);

	const filtered = $derived(
		search
			? conversations.filter((c: Conversation) => c.title.toLowerCase().includes(search.toLowerCase()))
			: conversations
	);

	// Group conversations by time period
	const grouped = $derived.by(() => {
		const today: Conversation[] = [];
		const yesterday: Conversation[] = [];
		const thisWeek: Conversation[] = [];
		const thisMonth: Conversation[] = [];
		const older: Conversation[] = [];

		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
		const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000);
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		for (const c of filtered) {
			const d = new Date(c.updatedAt);
			if (d >= startOfToday) today.push(c);
			else if (d >= startOfYesterday) yesterday.push(c);
			else if (d >= startOfWeek) thisWeek.push(c);
			else if (d >= startOfMonth) thisMonth.push(c);
			else older.push(c);
		}

		const groups: { label: string; items: Conversation[] }[] = [];
		if (today.length) groups.push({ label: 'Today', items: today });
		if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
		if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
		if (thisMonth.length) groups.push({ label: 'This Month', items: thisMonth });
		if (older.length) groups.push({ label: 'Older', items: older });
		return groups;
	});

	function handleDelete(id: string) {
		if (confirmDeleteId === id) {
			ondelete(id);
			confirmDeleteId = null;
		} else {
			confirmDeleteId = id;
			setTimeout(() => { if (confirmDeleteId === id) confirmDeleteId = null; }, 3000);
		}
	}

	// removed providerIcon text function — using inline SVG icons instead
</script>

<div class="sidebar-root flex flex-col h-full border-r border-gray-200 dark:border-gray-700/50 overflow-hidden" class:is-open={isOpen}>
	<!-- Toggle button — always visible, fixed size -->
	<!-- Top controls — always same padding, no layout shift -->
	<div class="header-controls flex-shrink-0 flex flex-col items-center px-2 pt-2 gap-2">
		<button
			onclick={() => (isOpen = !isOpen)}
			class="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
			title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
		>
			<svg class="w-5 h-5 transition-transform duration-300" class:rotate-180={isOpen} fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7" />
			</svg>
		</button>

		<!-- New Chat button — icon-only when collapsed, full when expanded -->
		<button
			onclick={onnewchat}
			class="new-chat-btn w-9 h-9 flex-shrink-0 flex items-center justify-center gap-2 rounded-xl font-semibold
				bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-violet-500/20
				hover:from-violet-500 hover:to-blue-500 active:scale-[0.97] transition-all duration-300 overflow-hidden"
			title="New Chat"
		>
			<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			<span class="new-chat-label text-sm whitespace-nowrap">New Chat</span>
		</button>

		<!-- Invisible separator to stabilize layout -->
		<div class="w-full h-px"></div>
	</div>

	<!-- Expandable content — hidden when collapsed -->
	<div class="expandable-content flex flex-col flex-1 min-h-0">
		<!-- Search -->
		<div class="px-3 pb-2">
			<div class="relative">
				<svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={search}
					placeholder="Search chats..."
					class="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
				/>
				{#if search}
					<button
						onclick={() => (search = '')}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Conversation count -->
		{#if filtered.length > 0}
			<div class="px-4 pb-1.5">
				<span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
					{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
				</span>
			</div>
		{/if}

		<!-- Conversation List (grouped) -->
		<div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-thin">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center py-12 px-4">
					<div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
						<svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							{#if search}
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							{:else}
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							{/if}
						</svg>
					</div>
					<p class="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
						{search ? 'No matches found' : 'No conversations yet'}
					</p>
					<p class="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5">
						{search ? 'Try a different search term' : 'Start a new chat to begin'}
					</p>
				</div>
			{/if}

			{#each grouped as group}
				<div class="mt-1 first:mt-0">
					<p class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1.5">{group.label}</p>
					{#each group.items as convo (convo.id)}
						<div
							class="group relative flex items-center rounded-lg mb-0.5 transition-all duration-150
								{currentId === convo.id
									? 'bg-blue-50 dark:bg-blue-900/20'
									: 'hover:bg-gray-100 dark:hover:bg-gray-800/60'}"
							onmouseenter={() => (hoverDeleteId = convo.id)}
							onmouseleave={() => { hoverDeleteId = null; if (confirmDeleteId === convo.id) confirmDeleteId = null; }}
						>
							<button
								onclick={() => onselect(convo.id)}
								class="flex-1 min-w-0 text-left px-3 py-2.5 rounded-lg transition-all duration-150"
							>
								<div class="flex items-center gap-2">
									<span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
										{convo.provider === 'openai'
											? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
											: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}">
										{#if convo.provider === 'openai'}
											<!-- OpenAI spark icon -->
											<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
										{:else}
											<!-- Gemini icon -->
											<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12c0 2.824.978 5.42 2.613 7.465C4.725 17.296 8.087 16 12 16s7.275 1.296 9.387 3.465A11.943 11.943 0 0 0 24 12c0-6.628-5.372-12-12-12zm0 22c-3.13 0-5.946-1.428-7.8-3.668C6.152 16.9 8.924 16 12 16s5.848.9 7.8 2.332A9.964 9.964 0 0 1 12 22z" opacity="0.3"/><path d="M12 2a10 10 0 0 0-7.743 16.332C6.152 16.9 8.924 16 12 16s5.848.9 7.8 2.332A10 10 0 0 0 12 2z" opacity="0.15"/><path d="M12 0L8.5 8.5 0 12l8.5 3.5L12 24l3.5-8.5L24 12l-8.5-3.5z"/></svg>
										{/if}
									</span>
									<span class="truncate text-sm font-medium
										{currentId === convo.id
											? 'text-blue-700 dark:text-blue-300'
											: 'text-gray-700 dark:text-gray-300'}">
										{convo.title}
									</span>
								</div>
							</button>

							<div class="flex-shrink-0 pr-1.5 {hoverDeleteId === convo.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150">
								<button
									onclick={(e) => { e.stopPropagation(); handleDelete(convo.id); }}
									class="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150
										{confirmDeleteId === convo.id
											? 'bg-red-500 text-white hover:bg-red-600'
											: 'text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400'}"
									title={confirmDeleteId === convo.id ? 'Click again to confirm' : 'Delete chat'}
								>
									{#if confirmDeleteId === convo.id}
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									{/if}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>

	</div>
</div>

<style>
	/* New chat button — fixed height, width transitions */
	.sidebar-root .new-chat-btn {
		min-width: 2.25rem;
		min-height: 2.25rem;
		height: 2.25rem;
	}

	.sidebar-root .new-chat-label {
		display: none;
	}

	.sidebar-root.is-open .header-controls {
		align-items: stretch;
	}

	.sidebar-root.is-open .new-chat-btn {
		width: 100%;
	}

	.sidebar-root.is-open .new-chat-label {
		display: inline;
	}

	/* Expandable content */
	.sidebar-root .expandable-content {
		opacity: 0;
		overflow: hidden;
		max-height: 0;
		transition: opacity 0.25s ease, max-height 0.3s ease;
		pointer-events: none;
	}

	.sidebar-root.is-open .expandable-content {
		opacity: 1;
		max-height: 100vh;
		transition: opacity 0.3s ease 0.1s, max-height 0.3s ease;
		pointer-events: auto;
	}

	/* Rotate the arrow */
	.rotate-180 {
		transform: rotate(180deg);
	}

	/* Scrollbar */
	.scrollbar-thin::-webkit-scrollbar {
		width: 4px;
	}
	.scrollbar-thin::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.3);
		border-radius: 9999px;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb:hover {
		background-color: rgba(156, 163, 175, 0.5);
	}
</style>
