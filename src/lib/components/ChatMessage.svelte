<script lang="ts">
	import { marked } from 'marked';
	import type { Citation, AttachedFile } from '$lib/chat';
	import CitationBadge from './CitationBadge.svelte';

	// Lazy-load highlight.js — only common languages, not all 190+
	// Reactive state so renderedContent re-computes when hljs finishes loading
	let hljsInstance = $state<typeof import('highlight.js').default | null>(null);
	let hljsLoading = false;

	async function loadHljs() {
		if (hljsInstance || hljsLoading) return hljsInstance;
		hljsLoading = true;
		try {
			const mod = await import('highlight.js/lib/core');
			const [
				js, ts, py, bash, json, html, css, sql, java, cpp, c,
				go, rust, yaml, xml, md, php, ruby, csharp, kotlin, swift
			] = await Promise.all([
				import('highlight.js/lib/languages/javascript'),
				import('highlight.js/lib/languages/typescript'),
				import('highlight.js/lib/languages/python'),
				import('highlight.js/lib/languages/bash'),
				import('highlight.js/lib/languages/json'),
				import('highlight.js/lib/languages/xml'),
				import('highlight.js/lib/languages/css'),
				import('highlight.js/lib/languages/sql'),
				import('highlight.js/lib/languages/java'),
				import('highlight.js/lib/languages/cpp'),
				import('highlight.js/lib/languages/c'),
				import('highlight.js/lib/languages/go'),
				import('highlight.js/lib/languages/rust'),
				import('highlight.js/lib/languages/yaml'),
				import('highlight.js/lib/languages/xml'),
				import('highlight.js/lib/languages/markdown'),
				import('highlight.js/lib/languages/php'),
				import('highlight.js/lib/languages/ruby'),
				import('highlight.js/lib/languages/csharp'),
				import('highlight.js/lib/languages/kotlin'),
				import('highlight.js/lib/languages/swift')
			]);
			const h = mod.default;
			h.registerLanguage('javascript', js.default);
			h.registerLanguage('js', js.default);
			h.registerLanguage('typescript', ts.default);
			h.registerLanguage('ts', ts.default);
			h.registerLanguage('python', py.default);
			h.registerLanguage('py', py.default);
			h.registerLanguage('bash', bash.default);
			h.registerLanguage('sh', bash.default);
			h.registerLanguage('shell', bash.default);
			h.registerLanguage('zsh', bash.default);
			h.registerLanguage('json', json.default);
			h.registerLanguage('html', html.default);
			h.registerLanguage('xml', xml.default);
			h.registerLanguage('css', css.default);
			h.registerLanguage('sql', sql.default);
			h.registerLanguage('java', java.default);
			h.registerLanguage('cpp', cpp.default);
			h.registerLanguage('c', c.default);
			h.registerLanguage('go', go.default);
			h.registerLanguage('rust', rust.default);
			h.registerLanguage('yaml', yaml.default);
			h.registerLanguage('markdown', md.default);
			h.registerLanguage('md', md.default);
			h.registerLanguage('php', php.default);
			h.registerLanguage('ruby', ruby.default);
			h.registerLanguage('csharp', csharp.default);
			h.registerLanguage('cs', csharp.default);
			h.registerLanguage('kotlin', kotlin.default);
			h.registerLanguage('swift', swift.default);
			hljsInstance = h;
		} catch {
			// Fallback: hljs stays null, code renders without highlighting
		} finally {
			hljsLoading = false;
		}
		return hljsInstance;
	}

	// Pre-load hljs when component mounts (non-blocking)
	if (typeof window !== 'undefined') {
		loadHljs();
	}

	let {
		role,
		content,
		userName,
		userImage,
		onedit,
		onregenerate,
		messageId,
		siblingCount,
		siblingIndex,
		onnavigate,
		citations,
		createdAt,
		isStreaming = false,
		attachedFile
	} = $props<{
		role: 'user' | 'assistant';
		content: string;
		userName?: string | null;
		userImage?: string | null;
		onedit?: (messageId: string, content: string) => void;
		onregenerate?: (messageId: string) => void;
		messageId?: string;
		siblingCount?: number;
		siblingIndex?: number;
		onnavigate?: (direction: 'prev' | 'next') => void;
		citations?: Citation[];
		createdAt?: string;
		isStreaming?: boolean;
		attachedFile?: AttachedFile;
	}>();

	const isUser = $derived(role === 'user');
	const hasSiblings = $derived((siblingCount ?? 0) > 1 && isUser);
	let copied = $state(false);

	const langNames: Record<string, string> = {
		bash: 'Bash', sh: 'Shell', zsh: 'Zsh', powershell: 'PowerShell', cmd: 'CMD',
		python: 'Python', py: 'Python', javascript: 'JavaScript', js: 'JavaScript',
		typescript: 'TypeScript', ts: 'TypeScript', java: 'Java', cpp: 'C++', c: 'C',
		csharp: 'C#', cs: 'C#', go: 'Go', rust: 'Rust', ruby: 'Ruby', php: 'PHP',
		swift: 'Swift', kotlin: 'Kotlin', sql: 'SQL', html: 'HTML', css: 'CSS',
		json: 'JSON', yaml: 'YAML', xml: 'XML', markdown: 'Markdown', md: 'Markdown',
		plaintext: 'Code', text: 'Code', '': 'Code'
	};

	let codeBlocks: string[] = [];

	const renderer = new marked.Renderer();

	// Wrap tables in a scrollable container for mobile
	const origTable = renderer.table.bind(renderer);
	renderer.table = (token: Parameters<typeof renderer.table>[0]) => {
		const html = origTable(token);
		return `<div class="table-wrapper">${html}</div>`;
	};

	// Shared ref updated before each render pass in $derived
	let _currentHljs: typeof import('highlight.js').default | null = null;

	renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
		const language = (lang || '').trim().toLowerCase();
		const displayLang = langNames[language] || language.charAt(0).toUpperCase() + language.slice(1) || 'Code';

		// Use highlight.js for syntax highlighting (if loaded)
		const h = _currentHljs;
		let highlighted: string;
		try {
			if (h && language && h.getLanguage(language)) {
				highlighted = h.highlight(text, { language }).value;
			} else if (h) {
				highlighted = h.highlightAuto(text).value;
			} else {
				highlighted = text
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
			}
		} catch {
			highlighted = text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		}

		const idx = codeBlocks.length;
		codeBlocks.push(text);
		return `<div class="code-block-wrapper">
			<div class="code-block-header">
				<span>${displayLang}</span>
				<button class="code-copy-btn" data-code-idx="${idx}" title="Copy code">
					<svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
					<svg class="check-icon" style="display:none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
				</button>
			</div>
			<pre><code class="hljs language-${language || 'plaintext'}">${highlighted}</code></pre>
		</div>`;
	};

	// Sanitize HTML output from marked to prevent XSS via LLM-generated content
	function sanitizeHtml(html: string): string {
		return html
			// Strip <script> tags and contents
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			// Strip event handler attributes (onclick, onerror, onload, etc.)
			.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
			// Strip javascript: URIs in href/src/action
			.replace(/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""')
			// Strip <iframe>, <object>, <embed>, <form>, <input>, <textarea>, <select>
			.replace(/<\/?(iframe|object|embed|form|input|textarea|select|base|meta|link|style)\b[^>]*>/gi, '')
			// Strip data: URIs in src (except images which are safe)
			.replace(/src\s*=\s*(?:"data:(?!image)[^"]*"|'data:(?!image)[^']*')/gi, 'src=""');
	}

	const renderedContent = $derived.by(() => {
		if (isUser) return '';
		// Read reactive state to trigger re-render when hljs loads
		_currentHljs = hljsInstance;
		codeBlocks = [];
		let text = content;
		const fenceMatches = text.match(/```/g);
		if (fenceMatches && fenceMatches.length % 2 !== 0) {
			text += '\n```';
		}
		const raw = marked.parse(text, {
			gfm: true,
			breaks: true,
			renderer
		}) as string;
		return sanitizeHtml(raw);
	});

	function handleBubbleClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const btn = target.closest('.code-copy-btn') as HTMLElement | null;
		if (btn) {
			const idx = parseInt(btn.getAttribute('data-code-idx') || '0', 10);
			const code = codeBlocks[idx] || '';
			navigator.clipboard.writeText(code);
			const copyIcon = btn.querySelector('.copy-icon') as HTMLElement;
			const checkIcon = btn.querySelector('.check-icon') as HTMLElement;
			if (copyIcon && checkIcon) {
				copyIcon.style.display = 'none';
				checkIcon.style.display = 'block';
				setTimeout(() => {
					copyIcon.style.display = 'block';
					checkIcon.style.display = 'none';
				}, 2000);
			}
		}
	}

	async function copyAll() {
		await navigator.clipboard.writeText(content);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function formatTime(dateStr?: string): string {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'} animate-fade-in">
	<div class="flex items-start gap-2 sm:gap-2.5 min-w-0 {isUser ? 'flex-row-reverse max-w-[85%] sm:max-w-[75%]' : 'max-w-[88%] sm:max-w-[85%] lg:max-w-[75%]'}">
		<!-- Avatar -->
		{#if isUser}
			{#if userImage}
				<img src={userImage} alt="You" class="w-7 h-7 rounded-full ring-2 ring-blue-500/30 flex-shrink-0 mt-0.5" />
			{:else}
				<div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
					{userName?.[0]?.toUpperCase() || '?'}
				</div>
			{/if}
		{:else}
			<div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20 mt-0.5">
				<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="3" x2="12" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><circle cx="12" cy="2" r="1.5" fill="currentColor" stroke="none" /><rect x="4" y="6" width="16" height="12" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5" /><circle cx="9" cy="12" r="2" fill="white" stroke="none" /><circle cx="15" cy="12" r="2" fill="white" stroke="none" /><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" /><path d="M9.5 16 Q12 18.5 14.5 16" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
				</svg>
			</div>
		{/if}

		<!-- Message bubble -->
		{#if isUser}
			<div class="group">
				<div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
					{#if attachedFile}
						<div class="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/20">
							<svg class="w-3.5 h-3.5 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<span class="text-[11px] font-medium text-blue-100 truncate max-w-[200px]">{attachedFile.name}</span>
						</div>
					{/if}
					<p class="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
				</div>
				<!-- Timestamp + action buttons -->
				{#if content}
					<div class="flex justify-end mt-1 {hasSiblings ? 'opacity-100' : 'sm:opacity-0 sm:group-hover:opacity-100'} transition-all duration-200">
						<div class="flex items-center gap-0.5">
							{#if createdAt}
								<span class="text-[10px] text-gray-400 dark:text-gray-500 mr-1">{formatTime(createdAt)}</span>
							{/if}
							{#if hasSiblings}
								<button
									onclick={() => onnavigate?.('prev')}
									disabled={siblingIndex === 0}
									class="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed not-disabled:hover:scale-110 not-disabled:hover:bg-gray-50 dark:not-disabled:hover:bg-gray-700"
									title="Previous version"
								>
									<svg class="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
									</svg>
								</button>
								<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 select-none min-w-[2rem] text-center">
									{(siblingIndex ?? 0) + 1}/{siblingCount}
								</span>
								<button
									onclick={() => onnavigate?.('next')}
									disabled={siblingIndex === (siblingCount ?? 1) - 1}
									class="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed not-disabled:hover:scale-110 not-disabled:hover:bg-gray-50 dark:not-disabled:hover:bg-gray-700"
									title="Next version"
								>
									<svg class="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
									</svg>
								</button>
								<div class="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5"></div>
							{/if}
							<button
								onclick={() => { navigator.clipboard.writeText(content); copied = true; setTimeout(() => copied = false, 2000); }}
								class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
								title="Copy message"
							>
								{#if copied}
									<svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2" />
										<path stroke-width="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
									</svg>
								{/if}
							</button>
							{#if onedit && messageId}
								<button
									onclick={() => onedit(messageId, content)}
									class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
									title="Edit & resend"
								>
									<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="group min-w-0">
				<div
					class="rounded-2xl rounded-tl-sm text-gray-800 dark:text-gray-200 px-3 sm:px-4 py-2.5 shadow-sm min-w-0 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
					onclick={handleBubbleClick}
					role="presentation"
				>
					<div class="prose prose-sm dark:prose-invert max-w-none break-words min-w-0">
						{@html renderedContent}
						{#if isStreaming && content}
							<span class="inline-block w-0.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-text-bottom"></span>
						{/if}
					</div>
				</div>

				<!-- Citations -->
				{#if citations && citations.length > 0}
					<div class="ml-0 mt-1">
						<CitationBadge {citations} />
					</div>
				{/if}

				<!-- Timestamp + copy + regenerate buttons -->
				{#if content}
					<div class="flex justify-start items-center gap-1 mt-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
						{#if createdAt}
							<span class="text-[10px] text-gray-400 dark:text-gray-500 mr-1">{formatTime(createdAt)}</span>
						{/if}
						<button
							onclick={copyAll}
							class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
							title="Copy response"
						>
							{#if copied}
								<svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2" />
									<path stroke-width="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
								</svg>
							{/if}
						</button>
						{#if onregenerate && messageId}
							<button
								onclick={() => onregenerate(messageId)}
								class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
								title="Regenerate response"
							>
								<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
