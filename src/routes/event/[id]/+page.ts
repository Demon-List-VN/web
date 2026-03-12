import { redirect } from "@sveltejs/kit";
import type { EventResponse } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
    const { id } = params;
    const event = await sdk.get<EventResponse>(`/events/${id}`, { fetch });

    if (event.redirect) {
        throw redirect(307, event.redirect);
    }

    return event;
}
