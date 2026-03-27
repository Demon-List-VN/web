export const ssr = false;

export async function load({ params }) {
	return { uid: params.uid, levelid: params.levelid };
}
