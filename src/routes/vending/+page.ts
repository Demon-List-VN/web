import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const ssr = false;

export async function load({ fetch }: Parameters<PageLoad>[0]) {
	return {};
}
