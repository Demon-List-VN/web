import type { PageLoad } from './$types';
import { supporterRevenueIntervalMs } from './campaign';

export const load: PageLoad = async ({ fetch }) => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/donations/overlay?interval=${supporterRevenueIntervalMs()}`
    );

    if (!response.ok) {
        return {
            overlay: {
                latestDonation: null,
                topSupporters: [],
                progress: {
                    totalRevenue: 0,
                    serverCostPercent: 0,
                    minecraftServerPercent: 0
                }
            }
        };
    }

    return {
        overlay: await response.json()
    };
};
