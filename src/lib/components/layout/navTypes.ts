import type { ComponentType } from 'svelte';

export type NavGroup = {
    name: string;
    icon: ComponentType;
    route?: string;
    routes?: { route: string; name: string; icon?: ComponentType; }[];
};
