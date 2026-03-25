<script lang="ts">
	type Conversation = {
		id: string;
		title: string;
		updatedAt: string;
		provider: string;
	};

	type Document = {
		id: string;
		filename: string;
		chunkCount: number;
		status: string;
		createdAt: string;
	};

	let {
		conversations,
		currentId,
		onselect,
		onnewchat,
		ondelete,
		onclear,
		userName,
		userImage,
		isOpen = $bindable(false)
	} = $props<{
		conversations: Conversation[];
		currentId: string | null;
		onselect: (id: string) => void;
		onnewchat: () => void;
		ondelete: (id: string) => void;
		onclear: () => void;
		userName?: string | null;
		userImage?: string | null;
		isOpen: boolean;
	}>();

	let search = $state('');
	let confirmDeleteId = $state<string | null>(null);
	let hoverDeleteId = $state<string | null>(null);
	let menuOpen = $state(false);
	let showDocuments = $state(false);
	let documents = $state<Document[]>([]);
	let loadingDocs = $state(false);
	let confirmDeleteDocId = $state<string | null>(null);
	let deletingDocId = $state<string | null>(null);

	async function loadDocuments() {
		loadingDocs = true;
		try {
			const res = await fetch('/api/documents');
			if (res.ok) {
				documents = await res.json();
			}
		} catch {
			console.error('Failed to load documents');
		} finally {
			loadingDocs = false;
		}
	}

	function handleDeleteDoc(docId: string) {
		if (confirmDeleteDocId === docId) {
			deleteDocument(docId);
			confirmDeleteDocId = null;
		} else {
			confirmDeleteDocId = docId;
			setTimeout(() => { confirmDeleteDocId = null; }, 3000);
		}
	}

	async function deleteDocument(docId: string) {
		deletingDocId = docId;
		try {
			const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
			if (res.ok) {
				documents = documents.filter((d) => d.id !== docId);
			}
		} catch {
			console.error('Failed to delete document');
		} finally {
			deletingDocId = null;
		}
	}

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

<div class="sidebar-root flex flex-col h-full overflow-hidden bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm" class:is-open={isOpen}>
	<!-- Toggle button — always visible, fixed size -->
	<!-- Top controls — always same padding, no layout shift -->
	<div class="header-controls flex-shrink-0 flex flex-col items-start px-2 pt-2 gap-2">
		<button
			onclick={() => (isOpen = !isOpen)}
			class="toggle-btn w-[2.25rem] h-[2.25rem] flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
			title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
		>
			<svg class="w-[1.125rem] h-[1.125rem] transition-transform duration-300" class:rotate-180={isOpen} fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
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
	<div class="expandable-content flex-1 min-h-0">
	  <div class="expandable-inner flex flex-col min-h-0 h-full">
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
						title="Clear search"
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
							onmouseleave={() => { hoverDeleteId = null; }}
						>
							<button
								onclick={() => onselect(convo.id)}
								class="flex-1 min-w-0 text-left px-3 py-2.5 rounded-lg transition-all duration-150"
							>
								<div class="flex items-center gap-2">
									<span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
										<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L8.5 8.5 0 12l8.5 3.5L12 24l3.5-8.5L24 12l-8.5-3.5z"/></svg>
									</span>
									<span class="truncate text-sm font-medium
										{currentId === convo.id
											? 'text-blue-700 dark:text-blue-300'
											: 'text-gray-700 dark:text-gray-300'}">
										{convo.title}
									</span>
								</div>
							</button>

							<div class="flex-shrink-0 pr-1.5 {hoverDeleteId === convo.id || confirmDeleteId === convo.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150">
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

	<!-- Bottom menu -->
	<div class="bottom-menu flex-shrink-0 px-2 relative flex flex-col items-start justify-center" style="min-height: calc(2.375rem + 1.25rem + 1.25rem + 1.25rem);">
		<button
			onclick={() => (menuOpen = !menuOpen)}
			class="bottom-menu-trigger flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 cursor-pointer py-2"
		>
			{#if userImage}
				<img src={userImage} alt="" class="w-[1.75rem] h-[1.75rem] flex-shrink-0 rounded-full object-cover" referrerpolicy="no-referrer" />
			{:else}
				<div class="w-[1.75rem] h-[1.75rem] flex-shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
					{userName ? userName[0].toUpperCase() : '?'}
				</div>
			{/if}
			<span class="bottom-menu-label truncate text-sm font-medium ml-2.5">{userName ?? 'User'}</span>
			<svg class="bottom-menu-label w-4 h-4 ml-auto text-gray-400 transition-transform duration-200" class:rotate-180={menuOpen} fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
			</svg>
		</button>

		{#if menuOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="fixed inset-0 z-40" onclick={() => { menuOpen = false; showDocuments = false; }} onkeydown={() => {}}></div>

			{#if isOpen}
				<div class="absolute bottom-full left-2 right-2 mb-1 z-50 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-black/10 dark:shadow-black/30 py-1 animate-menu-in">
					{#if showDocuments}
						<!-- Document list panel -->
						<div class="px-3 py-2">
							<button onclick={() => (showDocuments = false)} class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-2">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
								</svg>
								Back
							</button>
							<p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Uploaded Documents</p>
							{#if loadingDocs}
								<div class="flex items-center justify-center py-4">
									<div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
								</div>
							{:else if documents.length === 0}
								<p class="text-xs text-gray-400 dark:text-gray-500 text-center py-3">No documents uploaded</p>
							{:else}
								<div class="max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
									{#each documents as doc (doc.id)}
										<div class="flex items-center gap-2 px-2 py-1.5 rounded-lg group/doc {deletingDocId === doc.id ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}">
											<svg class="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											<div class="flex-1 min-w-0">
												<p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{doc.filename}</p>
												<p class="text-[10px] text-gray-400 dark:text-gray-500">{doc.chunkCount} chunks</p>
											</div>
											<button
												onclick={() => handleDeleteDoc(doc.id)}
												disabled={deletingDocId === doc.id}
												class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150
													{confirmDeleteDocId === doc.id
														? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
														: 'opacity-0 group-hover/doc:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}"
												title={confirmDeleteDocId === doc.id ? 'Click again to confirm' : 'Delete document'}
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<button
							onclick={() => { showDocuments = true; loadDocuments(); }}
							class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors rounded-lg"
						>
							<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							My Documents
						</button>
						<div class="mx-2 my-1 h-px bg-gray-100 dark:bg-gray-700"></div>
						<form method="POST" action="/logout" class="contents">
							<button
								type="submit"
								class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
								</svg>
								Log out
							</button>
						</form>
					{/if}
				</div>
			{:else}
				<div class="absolute bottom-full left-0 right-0 mb-1 z-50 flex flex-col items-center gap-1 py-1 animate-menu-in">
					<button
						onclick={() => { showDocuments = true; loadDocuments(); isOpen = true; }}
						class="group/tip relative w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg shadow-black/10 dark:shadow-black/30 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
						title="My Documents"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span class="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity duration-150">My Documents</span>
					</button>
					<form method="POST" action="/logout" class="contents">
						<button
							type="submit"
							class="group/tip relative w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg shadow-black/10 dark:shadow-black/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-colors"
							title="Log out"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
							<span class="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity duration-150">Log out</span>
						</button>
					</form>
				</div>
			{/if}
		{/if}
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

	/* Bottom menu — hide labels when collapsed, center avatar */
	.sidebar-root .bottom-menu-label {
		display: none;
	}

	.sidebar-root .bottom-menu-trigger {
		width: 2.25rem;
		justify-content: center;
		transition: none;
	}

	.sidebar-root.is-open .bottom-menu-trigger {
		width: 100%;
		justify-content: flex-start;
		padding-left: 0.25rem;
		transition: none;
	}

	.sidebar-root.is-open .bottom-menu-label {
		display: block;
	}

	/* Expandable content — uses grid row trick for smooth open AND close */
	.sidebar-root .expandable-content {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		visibility: hidden;
		transition: grid-template-rows 0.3s ease, opacity 0.2s ease, visibility 0s 0.3s;
		pointer-events: none;
		overflow: hidden;
	}

	.sidebar-root .expandable-inner {
		overflow: hidden;
		min-height: 0;
	}

	.sidebar-root.is-open .expandable-content {
		grid-template-rows: 1fr;
		opacity: 1;
		visibility: visible;
		transition: grid-template-rows 0.3s ease, opacity 0.25s ease 0.05s, visibility 0s;
		pointer-events: auto;
	}


	/* Menu pop-in animation */
	@keyframes menu-in {
		from { opacity: 0; transform: translateY(4px) scale(0.97); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	.animate-menu-in {
		animation: menu-in 0.15s ease-out;
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
