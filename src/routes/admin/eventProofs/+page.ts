import * as sdk from '$lib/client/sdk';
export async function load({ params, url, fetch }) {
    const proofs = await sdk.getEventProofs(false, { fetch })

    return {
        data: proofs
    }
}
