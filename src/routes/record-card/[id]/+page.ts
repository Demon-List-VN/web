export async function load({ params, fetch }) {
	const res = await fetch(`${import.meta.env.VITE_API_URL}/card/record/${params.id}`);
	if (!res.ok) {
		return { notFound: true };
	}
	const data = await res.json();
	return { ...data, id: params.id };
}
