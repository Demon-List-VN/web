import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
    const search = new URLSearchParams(url.searchParams);
    search.set('type', 'level');

    if (!search.getAll('target')
        .includes(params.id)) {
        search.append('target', params.id);
    }

    throw redirect(307, `/submit?${search.toString()}`);
};
