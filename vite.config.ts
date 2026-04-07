import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Smaller chunks = less memory per page load
		chunkSizeWarningLimit: 500,
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Split highlight.js into its own lazy chunk
					if (id.includes('highlight.js')) {
						return 'hljs';
					}
					// Split marked into its own chunk
					if (id.includes('marked')) {
						return 'marked';
					}
				}
			}
		}
	},
	// Reduce dev server memory usage
	server: {
		fs: {
			strict: true
		}
	}
});
