import type { Reroute } from '@sveltejs/kit';

// Strip the `/en` or `/vi` language prefix from the pathname so route matching
// hits the existing file-based routes. The original URL (with prefix) is still
// available via `event.url` in server hooks.
export const reroute: Reroute = ({ url }) => {
	const match = url.pathname.match(/^\/(en|vi)(\/.*)?$/);

	if (match) {
		return match[2] || '/';
	}
};
