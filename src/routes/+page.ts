import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/homepage`);

        if (response.ok) {
            const data = await response.json();

            return {
                homeData: {
                    ...data,
                    feedSeed: data?.feedSeed ?? Math.floor(Math.random() * 2_147_483_647)
                }
            };
        }
    } catch {}

    return {
        homeData: null
    };
};
