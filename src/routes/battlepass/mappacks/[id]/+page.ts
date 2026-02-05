import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const id = Number(params.id);

  try {
    // Try dedicated detail endpoint first
    const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappack/${id}`);
    if (res.ok) {
      const mapPackWrapper = await res.json();
      return { mapPackWrapper };
    }
    
    // Fallback: fetch list and pick by id
    const listRes = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappacks`);
    if (listRes.ok) {
      const packs = await listRes.json();
      const mapPackWrapper = packs.find((p: any) => p?.id === id);
      return { mapPackWrapper };
    }
  } catch (e) {
    console.error('Failed to load map pack detail:', e);
  }

  return { mapPackWrapper: null };
};
