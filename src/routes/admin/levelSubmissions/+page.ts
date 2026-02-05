export async function load({ fetch }) {
    // Note: This will be called without auth token initially
    // The actual authenticated fetch will be done on the client side if needed
    // For now, return empty array and let the page handle fetching with auth
    return {
        data: []
    }
}
