<script lang="ts">
	import {
		LayoutList,
		Ticket,
		Calendar,
		Users,
		Download,
		MessageCircle,
		BookOpen,
		ShoppingBag,
		MoreHorizontal,
		Shuffle,
		GitCompare,
		CreditCard,
		Bug,
		Swords
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
	export let onCustomLogoError: () => void;
	export let signIn: () => void;
	export let signOut: () => void | Promise<void>;

	$: linkGroup = [
		{ route: '/lists', name: 'Lists', icon: LayoutList },
		{ route: '/versus/play', name: '1v1 Versus', icon: Swords },
		{ route: '/battlepass', name: 'Pass', icon: Ticket },
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
					route: '/community',
					name: $locale === 'en' ? 'Community Hub' : 'Cộng đồng',
					icon: MessageCircle
				},
				{
					route: '/players',
					name: $locale === 'en' ? 'Players' : 'Người chơi',
					icon: Users
				},
				{
					route: '/clans',
					name: $locale === 'en' ? 'Clans' : 'Hội',
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
			route: '/store',
			name: $locale === 'en' ? 'Store' : 'Cửa hàng',
			icon: ShoppingBag
		},
		{
			route: '/vending',
			name: $locale === 'en' ? 'Card Maker' : 'Máy Tạo Thẻ',
			icon: CreditCard
		},
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
  {onCustomLogoError}
  {signIn}
  {signOut}
/>
<Sidebar {linkGroup} />
