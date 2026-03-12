import type { Province } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';
export async function load({ fetch }) {
    const res = await sdk.getProvinces({ fetch })

    return {
        provinces: {
            list: Object
                .keys(res)
                .map(key => res[key])
                .toSorted((a: Province, b: Province) => {
                    return a.name > b.name ? 1 : -1
                }),
            map: res
        }
    }
}
