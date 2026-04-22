import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const parentData = await parent();

	return {
		list: parentData.list ?? null,
		error: parentData.error ?? null,
		requiresAuthRecovery: Boolean(parentData.requiresAuthRecovery)
	};
};
