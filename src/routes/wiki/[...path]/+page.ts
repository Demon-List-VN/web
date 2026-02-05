export async function load({ fetch, params, url }) {
	const { path } = params;
	const parts: string[] = path.split('/');
	const locale = parts[0];
	const src = parts.slice(1).join('/');
	const page = Number(url.searchParams.get('page') || '1');
	const limit = 12;

	const detail: any = await (
		await fetch(
			`${import.meta.env.VITE_API_URL}/wiki/files/${src}?locale=${locale}&offset=${(page - 1) * limit}&limit=${limit}&sortBy=path`
		)
	).json();

	return { locale, detail };
}
