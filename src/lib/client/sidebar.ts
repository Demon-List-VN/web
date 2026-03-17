import { writable } from 'svelte/store';

export const sidebarOpen = writable(false);
export const sidebarCollapsed = writable(true);

export function toggleSidebar() {
	sidebarOpen.update((v) => !v);
}

export function closeSidebar() {
	sidebarOpen.set(false);
}

export function openSidebar() {
	sidebarOpen.set(true);
}

export function setSidebarCollapsed(value: boolean) {
	sidebarCollapsed.set(value);
	if (typeof window !== 'undefined') {
		localStorage.setItem('sidebarCollapsed', value ? 'true' : 'false');
	}
}

export function toggleSidebarCollapsed() {
	sidebarCollapsed.update((value) => {
		const nextValue = !value;
		if (typeof window !== 'undefined') {
			localStorage.setItem('sidebarCollapsed', nextValue ? 'true' : 'false');
		}
		return nextValue;
	});
}

export function hydrateSidebarCollapsed() {
	if (typeof window === 'undefined') {
		return;
	}

	sidebarCollapsed.set(localStorage.getItem('sidebarCollapsed') !== 'false');
}
