export async function load({ fetch, params }) {
	const { path } = params;
	const parts: string[] = path.split('/');
	const locale = parts[0];
	const src = parts.slice(1).join('/');

	const detail: any = await (
		await fetch(`${import.meta.env.VITE_API_URL}/wiki/files/${src}?locale=${locale}`)
	).json();

	return { locale, detail };
}
