<script lang="ts">
	import {
		LayoutList,
		Calendar,
		Users,
		Download,
		BookOpen,
		MoreHorizontal,
		Shuffle,
		GitCompare,
		Bug,
		Swords,
		Trophy
	} from 'lucide-svelte';
	import { locale } from 'svelte-i18n';

	import Sidebar from '$lib/components/sidebar.svelte';
	import DiscordLogo from '$lib/components/icons/DiscordLogo.svelte';
	import Navbar from './Navbar.svelte';
	import type { NavGroup } from './navTypes';

	export let searchToggled = false;
	export let navLogoSrc: string;
	export let navLogoAlt: string;
	export let useCustomListLogo = false;
	export let navBannerUrl = '';
	export let onCustomLogoError: () => void;
	export let signIn: () => void;
	export let signOut: () => void | Promise<void>;

	$: linkGroup = [
		{ route: '/lists', name: 'Lists', icon: LayoutList },
		{ route: '/versus/play', name: '1v1 Versus', icon: Swords },
		{
			route: '/tournaments',
			name: $locale === 'en' ? 'Tournaments' : 'Giải đấu',
			icon: Trophy
		},
		{
			route: '/events',
			name: $locale === 'en' ? 'Event' : 'Sự kiện',
			icon: Calendar
		},
		{
			name: $locale === 'en' ? 'Community' : 'Cộng đồng',
			icon: Users,
			routes: [
				{
					route: '/players',
					name: $locale === 'en' ? 'Players' : 'Người chơi',
					icon: Users
				},
				{
					route: '/clans',
					name: $locale === 'en' ? 'Clans' : 'Hội',
					icon: Users
				},
				{
					route: '/organizations',
					name: $locale === 'en' ? 'Organizations' : 'Tổ chức',
					icon: Users
				}
			]
		},
		{
			route: '/geode-mods',
			name: $locale === 'en' ? 'Mod' : 'Mod',
			icon: Download
		},
		{ route: '/discord', name: 'Discord', icon: DiscordLogo },
		{ route: '/wiki', name: 'Wiki', icon: BookOpen },
		{
			route:
				'https://docs.google.com/forms/d/e/1FAIpQLSdF4pJFdwbrFKQPLU0PPPX-bkrPJpMTSnlJ6XWNbSCpSOUqpQ/viewform?usp=dialog',
			name: $locale === 'en' ? 'Bug Report' : 'Báo lỗi',
			icon: Bug
		},
		{
			name: $locale === 'en' ? 'Misc' : 'Khác',
			icon: MoreHorizontal,
			routes: [
				{
					route: '/misc/compare',
					name: $locale === 'en'
						? 'Player comparison'
						: 'So sánh người chơi',
					icon: GitCompare
				},
				{
					route: '/misc/roulette',
					name: 'Roulette',
					icon: Shuffle
				},
				{
					route: '/misc/roulette-v2',
					name: 'Roulette v2',
					icon: Shuffle
				}
			]
		}
	] as NavGroup[];
</script>

<Navbar
  bind:searchToggled
  {navLogoSrc}
  {navLogoAlt}
  {useCustomListLogo}
  {navBannerUrl}
  {onCustomLogoError}
  {signIn}
  {signOut}
/>
<Sidebar {linkGroup} />
