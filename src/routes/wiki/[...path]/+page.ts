export async function load({ fetch, params }) {
	const { path } = params;
	const data: any = await (
		await fetch(`${import.meta.env.VITE_API_URL}/wiki/files/${path}`)
	).json();

	return data.reduce((acc: any, item: any) => {
		acc[item.locale] = item;
		return acc;
	}, {});
}
