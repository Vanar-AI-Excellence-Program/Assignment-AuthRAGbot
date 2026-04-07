let dark = $state(true);

export const theme = {
	get dark() {
		return dark;
	},
	init() {
		if (typeof document !== 'undefined') {
			dark = document.documentElement.classList.contains('dark');
		}
	},
	toggle() {
		if (typeof document === 'undefined') return;
		// Enable transitions only during theme switch, then remove
		document.documentElement.classList.add('dark-transitioning');
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
		setTimeout(() => {
			document.documentElement.classList.remove('dark-transitioning');
		}, 350);
	}
};
