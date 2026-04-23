export const ssr = false;

export async function load({ params, url }) {
	return {
		uid: params.uid,
		levelid: params.levelid,
		// Optional ?id= query param targets a specific record row. Used by
		// the reviewer flow to load a pending replacement instead of the
		// now-preferred accepted row at the same (uid, levelid).
		recordId: url.searchParams.get('id') ?? null
	};
}
