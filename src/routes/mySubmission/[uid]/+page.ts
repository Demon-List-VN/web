import type { PageLoad } from './$types';

export async function load({ params, fetch }: Parameters<PageLoad>[0]) {
    const [recordsRes, levelSubmissionsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/players/${params.uid}/submissions?end=500`),
        fetch(`${import.meta.env.VITE_API_URL}/level-submissions/user/${params.uid}`)
    ])

    const records: any[] = await recordsRes.json()
    const levelSubmissions: any[] = await levelSubmissionsRes.json()

    return {
        records,
        levelSubmissions
    }
};