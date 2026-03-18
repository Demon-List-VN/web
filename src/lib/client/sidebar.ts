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
}

export function toggleSidebarCollapsed() {
	sidebarCollapsed.update((value) => !value);
}
