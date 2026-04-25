import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const proofs = await (await fetch(`${import.meta.env.VITE_API_URL}/events/proofs?accepted=false`)).json()

    return {
        data: proofs
    }
}