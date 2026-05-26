import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rules`);
    const rules = await res.json();

    return {
        rules
    };
};
