import { redirect } from "@sveltejs/kit";
import * as sdk from '$lib/client/sdk';

export async function load({ params, url, fetch }) {
    const { id } = params;
    const event = await sdk.getEvent(id, { fetch });

    if (event.redirect) {
        throw redirect(307, event.redirect);
    }

    return event;
}
