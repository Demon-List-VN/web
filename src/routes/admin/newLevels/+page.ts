import * as sdk from '$lib/client/sdk';
export async function load({ params, fetch }) {
    const res = await sdk.getNewLevels({ fetch })

    return {
        data: res
    }
};
