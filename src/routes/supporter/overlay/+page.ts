import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/donations/overlay`
    );

    if (!response.ok) {
        return {
            overlay: {
                latestDonation: null,
                topSupporters: []
            }
        };
    }

    return {
        overlay: await response.json()
    };
};
