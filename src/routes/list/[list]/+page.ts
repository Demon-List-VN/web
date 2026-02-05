async function getTotalPage(fetch: any, list: string) {
	const query = new URLSearchParams({
		start: '0',
		end: '0',
		sortBy: list == 'fl' ? 'flTop' : 'dlTop',
		ascending: 'false'
	});

	const res = await (
		await fetch(`${import.meta.env.VITE_API_URL}/list/${list}?${query.toString()}`)
	).json();

	return res[0][list == 'fl' ? 'flTop' : 'dlTop'];
}

async function getLevels(fetch: any, list: string, page: number, uid: string | null) {
	let sortBy = list == 'fl' ? 'flTop' : 'dlTop';

	if(list == 'cl') {
		sortBy = 'created_at'
	}

	const query = new URLSearchParams({
		start: String((page - 1) * 50),
		end: String(page * 50 - 1),
		sortBy: sortBy,
		ascending: 'true',
		uid: !uid ? '' : uid
	});

	const res = await (
		await fetch(`${import.meta.env.VITE_API_URL}/list/${list}?${query.toString()}`)
	).json();

	return res;
}

export async function load({ params, url, fetch }) {
	const uid = url.searchParams.get('uid');
	const page = parseInt(url.searchParams.get('page') || '1');

	return {
		count: await getTotalPage(fetch, params.list),
		levels: await getLevels(fetch, params.list, page, uid)
	};
}
