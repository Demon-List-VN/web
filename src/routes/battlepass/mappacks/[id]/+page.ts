import type { PageLoad } from './$types';
import type { MapPackWrapper } from '$lib/client/apiTypes';
import * as sdk from '$lib/client/sdk';

export const load: PageLoad = async ({ params, fetch }) => {
  const id = Number(params.id);

  try {
    // Try dedicated detail endpoint first
    const res = await sdk.fetchBattlepassMappack(id, { fetch });
    if (res.ok) {
      const mapPackWrapper = (await res.json()) as MapPackWrapper;
      return { mapPackWrapper };
    }
    
    // Fallback: fetch list and pick by id
    const listRes = await sdk.fetchBattlepassMappacks({ fetch });
    if (listRes.ok) {
      const packs = (await listRes.json()) as MapPackWrapper[];
      const mapPackWrapper = packs.find((p) => p.id === id) ?? null;
      return { mapPackWrapper };
    }
  } catch (e) {
    console.error('Failed to load map pack detail:', e);
  }

  return { mapPackWrapper: null };
};
