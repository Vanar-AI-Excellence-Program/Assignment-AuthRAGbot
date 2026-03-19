<script lang="ts">
	let { value = $bindable(''), onsubmit, disabled = false, onfileupload, attachedFile, onremovefile } = $props<{
		value: string;
		onsubmit: () => void;
		disabled?: boolean;
		onfileupload?: (file: File) => void;
		attachedFile?: { name: string; chunkCount: number } | null;
		onremovefile?: () => void;
	}>();

	let textarea: HTMLTextAreaElement;
	let fileInput: HTMLInputElement;
	let isUploading = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onsubmit();
		}
	}

	function handleFileClick() {
		fileInput?.click();
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !onfileupload) return;
		isUploading = true;
		try {
			await onfileupload(file);
		} finally {
			isUploading = false;
			input.value = '';
		}
	}

	$effect(() => {
		void value;
		if (textarea) {
			textarea.style.height = 'auto';
			const maxHeight = 150;
			if (textarea.scrollHeight > maxHeight) {
				textarea.style.height = maxHeight + 'px';
				textarea.style.overflowY = 'auto';
			} else {
				textarea.style.height = textarea.scrollHeight + 'px';
				textarea.style.overflowY = 'hidden';
			}
		}
	});
</script>

<form
	onsubmit={(e) => { e.preventDefault(); onsubmit(); }}
	class="relative"
>
	<div class="rounded-xl border border-gray-200 dark:border-gray-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
		<!-- Attached file chip -->
		{#if attachedFile}
			<div class="px-3 pt-2.5 pb-0">
				<div class="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg px-2.5 py-1.5 animate-fade-in">
					<svg class="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[200px]">{attachedFile.name}</span>
					<span class="text-[10px] text-blue-400 dark:text-blue-500">{attachedFile.chunkCount} chunks</span>
					<button
						type="button"
						onclick={() => onremovefile?.()}
						class="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
						title="Remove file"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/if}

		<div class="flex items-end">
			<!-- Textarea -->
			<textarea
				bind:this={textarea}
				bind:value
				onkeydown={handleKeydown}
				{disabled}
				rows="1"
				placeholder="Type your message..."
				class="flex-1 resize-none bg-transparent text-gray-900 dark:text-gray-100 pl-4 pr-1 py-3 text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
			></textarea>

			<!-- Right side buttons -->
			<div class="flex items-center gap-0.5 pr-2 py-2">
				<!-- File upload button -->
				{#if onfileupload}
					<button
						type="button"
						onclick={handleFileClick}
						disabled={disabled || isUploading}
						class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Upload document (PDF, TXT)"
					>
						{#if isUploading}
							<div class="w-4 h-4 border-2 border-gray-300 dark:border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
							</svg>
						{/if}
					</button>
					<input
						bind:this={fileInput}
						type="file"
						accept=".pdf,.txt,application/pdf,text/plain"
						onchange={handleFileChange}
						class="hidden"
					/>
				{/if}

				<!-- Send button -->
				<button
					type="submit"
					disabled={disabled || !value.trim()}
					class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
				>
					{#if disabled}
						<div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					{:else}
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</div>
</form>
