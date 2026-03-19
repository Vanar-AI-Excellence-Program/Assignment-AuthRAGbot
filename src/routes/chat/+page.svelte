<script lang="ts">
	import type { PageData } from './$types';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatSidebar from '$lib/components/ChatSidebar.svelte';
	import {
		type ChatNode,
		type Citation,
		createRootNode,
		createNode,
		getDisplayPath,
		getActivePath,
		getActiveLeaf,
		findNode,
		findParent,
		navigateSibling,
		attachChild,
		treeFromMessages,
		parseCitations
	} from '$lib/chat';

	let { data } = $props<{ data: PageData }>();

	let root = $state<ChatNode>(createRootNode());
	let input = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let provider = $state<'openai' | 'gemini'>('gemini');
	let isClearing = $state(false);
	let chatContainer = $state<HTMLDivElement | undefined>(undefined);
	let forkTargetId = $state<string | null>(null);
	let sidebarOpen = $state(false);
	let uploadNotice = $state<string | null>(null);
	let attachedFile = $state<{ name: string; chunkCount: number } | null>(null);

	// Conversation persistence
	let currentConversationId = $state<string | null>(null);
	let conversationList = $derived(data.conversations ?? []);

	const user = $derived(data.session?.user?.id ? data.session.user : null);
	const displayPath = $derived.by(() => getDisplayPath(root));
	const hasMessages = $derived(displayPath.length > 0);

	let shouldScrollToBottom = $state(true);

	// Typewriter for welcome heading
	let typedText = $state('');
	let showCursor = $state(true);
	const welcomeText = $derived(
		`Hey${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I'm Pascal`
	);
	let typewriterDone = $state(false);

	// Typewriter for subtitle
	let typedSubtext = $state('');
	let showSubCursor = $state(false);
	const subtitleText = 'Your AI assistant, powered by Passly. Ask me anything — attach documents for context-grounded answers.';
	let subtitleDone = $state(false);

	$effect(() => {
		if (!hasMessages && !typewriterDone) {
			typedText = '';
			let i = 0;
			const text = welcomeText;
			const interval = setInterval(() => {
				if (i < text.length) {
					typedText = text.slice(0, i + 1);
					i++;
				} else {
					clearInterval(interval);
					typewriterDone = true;
					setTimeout(() => { showCursor = false; showSubCursor = true; }, 500);
				}
			}, 50);
			return () => clearInterval(interval);
		}
	});

	$effect(() => {
		if (typewriterDone && !subtitleDone && showSubCursor) {
			typedSubtext = '';
			let i = 0;
			const interval = setInterval(() => {
				if (i < subtitleText.length) {
					typedSubtext = subtitleText.slice(0, i + 1);
					i++;
				} else {
					clearInterval(interval);
					subtitleDone = true;
					setTimeout(() => { showSubCursor = false; }, 1000);
				}
			}, 25);
			return () => clearInterval(interval);
		}
	});

	function scrollToBottom() {
		if (chatContainer && shouldScrollToBottom) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	$effect(() => {
		displayPath;
		scrollToBottom();
	});

	function startNewChat() {
		isClearing = true;
		error = null;
		currentConversationId = null;
		setTimeout(() => {
			root = createRootNode();
			forkTargetId = null;
			isClearing = false;
		}, 400);
	}

	function clearChat() {
		startNewChat();
	}

	function handleEditMessage(messageId: string, content: string) {
		if (isLoading) return;
		const parent = findParent(messageId, root);
		if (parent) {
			forkTargetId = parent.id;
			input = content;
		}
	}

	function handleNavigateSibling(nodeId: string, direction: 'prev' | 'next') {
		shouldScrollToBottom = false;
		navigateSibling(root, nodeId, direction);
	}

	async function loadConversation(convoId: string) {
		try {
			const res = await fetch(`/api/conversations/${convoId}`);
			if (!res.ok) return;
			const data = await res.json();
			root = treeFromMessages(data.messages);
			currentConversationId = convoId;
			provider = data.conversation.provider || 'gemini';
			shouldScrollToBottom = true;
		} catch (e) {
			console.error('Failed to load conversation:', e);
		}
	}

	async function deleteConversation(convoId: string) {
		try {
			await fetch(`/api/conversations/${convoId}`, { method: 'DELETE' });
			conversationList = conversationList.filter((c: { id: string }) => c.id !== convoId);
			if (currentConversationId === convoId) {
				startNewChat();
			}
		} catch (e) {
			console.error('Failed to delete conversation:', e);
		}
	}

	async function saveMessage(
		conversationId: string,
		parentId: string | null,
		role: string,
		content: string,
		citations?: Citation[]
	): Promise<string | null> {
		try {
			const res = await fetch(`/api/conversations/${conversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ parentId, role, content, citations })
			});
			if (!res.ok) return null;
			const msg = await res.json();
			return msg.id;
		} catch {
			return null;
		}
	}

	async function handleFileUpload(file: File) {
		uploadNotice = null;
		attachedFile = null;
		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const err = await res.json();
				error = err.error || 'Upload failed';
				return;
			}

			const doc = await res.json();
			attachedFile = { name: doc.filename, chunkCount: doc.chunkCount };
		} catch {
			error = 'Failed to upload document';
		}
	}

	async function handleSubmit() {
		if (!input.trim() || isLoading) return;

		let attachTo: ChatNode;
		if (forkTargetId) {
			attachTo = findNode(forkTargetId, root) || getActiveLeaf(root);
			forkTargetId = null;
		} else {
			attachTo = getActiveLeaf(root);
		}

		const userNode = attachChild(attachTo, createNode('user', input.trim()));
		if (attachedFile) {
			userNode.attachedFile = { ...attachedFile };
		}

		const userMessage = input.trim();
		input = '';
		attachedFile = null;
		isLoading = true;
		error = null;
		shouldScrollToBottom = true;

		const assistantNodeData = createNode('assistant', '');
		const assistantNode = attachChild(userNode, assistantNodeData);

		// Create conversation if needed
		if (!currentConversationId) {
			try {
				const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '');
				const res = await fetch('/api/conversations', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, provider })
				});
				if (res.ok) {
					const convo = await res.json();
					currentConversationId = convo.id;
					conversationList = [
						{ id: convo.id, title: convo.title, provider, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
						...conversationList
					];
				}
			} catch (e) {
				console.error('Failed to create conversation:', e);
			}
		}

		// Save user message to DB
		let userDbId: string | null = null;
		if (currentConversationId) {
			const parentDbId = attachTo.dbId || null;
			userDbId = await saveMessage(currentConversationId, parentDbId, 'user', userMessage);
			if (userDbId) userNode.dbId = userDbId;
		}

		try {
			const path = getActivePath(root);
			const history = path
				.filter((n) => n.id !== assistantNode.id)
				.map((n) => ({ role: n.role, content: n.content }));

			// Find attached file from current message or any earlier message in the path
			const attachedFileName = path.find((n) => n.attachedFile)?.attachedFile?.name || null;

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider, messages: history, attachedFileName })
			});

			if (!response.ok) {
				throw new Error(
					response.status === 401
						? 'Please sign in to use chat.'
						: 'Failed to get response. Please try again.'
				);
			}

			if (!response.body) throw new Error('No response body');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				assistantNode.content += chunk;
				scrollToBottom();
			}

			// Parse citations from stream
			const { cleanContent, citations } = parseCitations(assistantNode.content);
			assistantNode.content = cleanContent;
			if (citations.length > 0) {
				assistantNode.citations = citations;
			}

			// Save assistant message to DB
			if (currentConversationId && userDbId) {
				const assistantDbId = await saveMessage(
					currentConversationId,
					userDbId,
					'assistant',
					cleanContent,
					citations.length > 0 ? citations : undefined
				);
				if (assistantDbId) assistantNode.dbId = assistantDbId;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			userNode.children = userNode.children.filter((c) => c.id !== assistantNode.id);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Pascal - Passly</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css" />
</svelte:head>

<div class="flex h-[calc(100dvh-4rem)]">

	<!-- Sidebar -->
	<div
		class="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden {sidebarOpen ? 'w-72' : 'w-[3.25rem]'}"
	>
		<div class="{sidebarOpen ? 'w-72' : 'w-[3.25rem]'} h-full transition-all duration-300 ease-in-out">
			<ChatSidebar
				conversations={conversationList}
				currentId={currentConversationId}
				onselect={loadConversation}
				onnewchat={startNewChat}
				ondelete={deleteConversation}
				bind:isOpen={sidebarOpen}
			/>
		</div>
	</div>

	<!-- Main Chat Area -->
	<div class="flex-1 flex flex-col min-w-0">
		{#if !user}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center">
					<div class="w-20 h-20 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-500/20">
						<svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="8" width="18" height="12" rx="3" /><circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4" /><circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" /><path d="M1 14h2M21 14h2" />
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Must login before using Pascal</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">the AI-chat companion</p>
					<a href="/login" class="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all">
						Sign In
					</a>
				</div>
			</div>
		{:else}
		<div class="flex flex-col flex-1 min-h-0">
			<!-- Chat Header -->
			<div class="border-b border-gray-200 dark:border-gray-700/50 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20">
						<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="8" width="18" height="12" rx="3" /><circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4" /><circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" /><path d="M1 14h2M21 14h2" />
						</svg>
					</div>
					<div>
						<h1 class="text-base font-bold text-gray-900 dark:text-white">Pascal</h1>
						<p class="text-xs text-gray-500 dark:text-gray-400">By Passly</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<select
						bind:value={provider}
						disabled={isLoading}
						class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
					>
						<option value="openai">GPT-5 Mini</option>
						<option value="gemini">Gemini 2.5 Flash</option>
					</select>
					{#if hasMessages}
						<button
							onclick={clearChat}
							class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-all"
						>
							Clear
						</button>
					{/if}
				</div>
			</div>

			<!-- Messages Area -->
			<div
				bind:this={chatContainer}
				class="flex-1 overflow-y-auto py-5 space-y-5 {isClearing ? 'chat-clearing' : ''}"
			>
				<div class="max-w-4xl mx-auto px-4 sm:px-6">
					{#if !hasMessages}
						<!-- Welcome State -->
						<div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
							<div class="w-20 h-20 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/20">
								<svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
									<rect x="3" y="8" width="18" height="12" rx="3" /><circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4" /><circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" /><path d="M1 14h2M21 14h2" />
								</svg>
							</div>
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
								{#if typedText.includes('Pascal')}
									{typedText.slice(0, typedText.indexOf('Pascal'))}<span class="text-blue-600 dark:text-blue-400">Pascal</span>
								{:else}
									{typedText}
								{/if}{#if showCursor}<span class="inline-block w-0.5 h-6 bg-gray-800 dark:bg-white animate-pulse ml-0.5 align-text-bottom"></span>{/if}
							</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-1 min-h-[1.25rem]">
								{typedSubtext}{#if showSubCursor}<span class="inline-block w-0.5 h-4 bg-gray-400 dark:bg-gray-500 animate-pulse ml-0.5 align-text-bottom"></span>{/if}
							</p>
							<p class="text-xs text-gray-400 dark:text-gray-500 mb-7">
								Pick a topic below or type your own message to get started.
							</p>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md w-full">
								<button
									onclick={() => { input = 'Explain how authentication works in web apps'; handleSubmit(); }}
									class="text-left text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
								>
									<span class="font-medium text-blue-600 dark:text-blue-400">Explain</span> how authentication works in web apps
								</button>
								<button
									onclick={() => { input = 'What are the best practices for password security?'; handleSubmit(); }}
									class="text-left text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
								>
									<span class="font-medium text-orange-600 dark:text-orange-400">Best practices</span> for password security
								</button>
								<button
									onclick={() => { input = 'Help me write a TypeScript function to validate email addresses'; handleSubmit(); }}
									class="text-left text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
								>
									<span class="font-medium text-blue-600 dark:text-blue-400">Write</span> a TypeScript email validator
								</button>
								<button
									onclick={() => { input = 'What is the difference between OAuth and JWT?'; handleSubmit(); }}
									class="text-left text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
								>
									<span class="font-medium text-orange-600 dark:text-orange-400">Compare</span> OAuth vs JWT
								</button>
							</div>
						</div>
					{/if}

					{#each displayPath as { node, siblingCount, siblingIndex } (node.id)}
						{#if node.role === 'assistant' && node.content === '' && isLoading}
							<!-- Typing indicator -->
							<div class="flex justify-start animate-fade-in">
								<div class="flex items-start gap-2.5 max-w-[75%]">
									<div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20 mt-0.5">
										<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
											<rect x="3" y="8" width="18" height="12" rx="3" /><circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4" /><circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
										</svg>
									</div>
									<div class="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100 dark:border-gray-700/50">
										<div class="flex items-center gap-1.5">
											<span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
											<span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
											<span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
										</div>
									</div>
								</div>
							</div>
						{:else}
							<ChatMessage
								role={node.role}
								content={node.content}
								userName={user?.name}
								userImage={user?.image}
								messageId={node.id}
								onedit={handleEditMessage}
								siblingCount={siblingCount}
								siblingIndex={siblingIndex}
								onnavigate={(dir) => handleNavigateSibling(node.id, dir)}
								citations={node.citations}
								createdAt={node.createdAt}
								isStreaming={isLoading && node.role === 'assistant' && node === getActiveLeaf(root)}
								attachedFile={node.attachedFile}
							/>
						{/if}
					{/each}

					<!-- Error -->
					{#if error}
						<div class="animate-scale-in flex justify-center">
							<div class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm rounded-xl p-4 border border-red-200 dark:border-red-800 flex items-center gap-3 max-w-md">
								<div class="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
									</svg>
								</div>
								<span>{error}</span>
								<button aria-label="Dismiss error" onclick={() => (error = null)} class="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Input Area -->
			<div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700/50 px-4 sm:px-6 py-3">
				<div class="max-w-4xl mx-auto">
					<ChatInput bind:value={input} onsubmit={handleSubmit} disabled={isLoading} onfileupload={handleFileUpload} {attachedFile} onremovefile={() => (attachedFile = null)} />
					<p class="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
						<span class="font-semibold text-blue-500/70 dark:text-blue-400/70">Passly</span><span class="mx-1 text-gray-300 dark:text-gray-600">:</span><span>Secured by</span>
						<span class="font-semibold text-gray-500 dark:text-gray-400">Pascal.</span>
					</p>
				</div>
			</div>
		</div>
		{/if}
	</div>
</div>
