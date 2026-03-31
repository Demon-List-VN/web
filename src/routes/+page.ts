export const load = async ({ fetch }) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/homepage`);
        if (response.ok) {
            const data = await response.json();
            return {
                homeData: data
            };
        }
    } catch {}
    
    return {
        homeData: null
    };
};