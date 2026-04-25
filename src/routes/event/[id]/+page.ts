import { redirect } from "@sveltejs/kit";
import type { PageLoad } from './$types';

export async function load({ params, url, fetch }: Parameters<PageLoad>[0]) {
    const { id } = params;
    const event: any =
        await (await fetch(`${import.meta.env.VITE_API_URL}/events/${id}`))
            .json();

    if (event.redirect) {
        throw redirect(307, event.redirect);
    }

    return event;
}
