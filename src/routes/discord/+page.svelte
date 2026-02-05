<script lang="ts">
	import BigTitle from '$lib/components/bigTitle.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { fade } from 'svelte/transition';
	import { Bot, Gem, Terminal, Users } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	const BOT_INVITE_URL =
		'https://discord.com/oauth2/authorize?client_id=1071500325338488843&permissions=85056&integration_type=0&scope=bot';
	const SERVER_INVITE_URL = 'https://discord.com/invite/MnGVdtjq49';

	interface Command {
		name: string;
		description: string;
		params: { name: string; description: string; required: boolean }[];
		supporterOnly?: boolean;
	}

	const commands: Command[] = [
		{
			name: '/recent',
			description: 'Lấy bản ghi được chấp nhận mới nhất',
			params: [
				{ name: 'user', description: 'Người dùng để lấy bản ghi', required: false },
				{ name: 'list', description: 'Lọc theo list', required: false }
			]
		},
		{
			name: '/profile',
			description: 'Lấy hồ sơ của người dùng',
			params: [{ name: 'user', description: 'Người dùng muốn xem hồ sơ', required: false }]
		},
		{
			name: '/leaderboard',
			description: 'Lấy bảng xếp hạng, sắp xếp theo top',
			params: [
				{ name: 'list', description: 'Chọn list', required: true },
				{ name: 'page', description: 'Số trang (mặc định: 1)', required: false }
			],
			supporterOnly: true
		},
		{
			name: '/supporter',
			description: 'Kiểm tra trạng thái supporter của người chơi',
			params: [{ name: 'user', description: 'Người dùng muốn kiểm tra', required: false }]
		},
		{
			name: '/level',
			description: 'Lấy thông tin của một level',
			params: [{ name: 'query', description: 'Tên hoặc ID của level', required: true }]
		},
		{
			name: '/list',
			description: 'Lấy level trong list, sắp xếp theo top',
			params: [
				{ name: 'list', description: 'Chọn list', required: true },
				{ name: 'page', description: 'Số trang (mặc định: 1)', required: false }
			],
			supporterOnly: true
		},
		{
			name: '/best',
			description: 'Lấy bản ghi tốt nhất của người chơi',
			params: [
				{ name: 'list', description: 'Chọn list', required: true },
				{ name: 'user', description: 'Người dùng để lấy bản ghi', required: false }
			]
		}
	];
</script>

<svelte:head>
	<title>Discord - Geometry Dash VN</title>
	<meta
		name="description"
		content="Tham gia cộng đồng Geometry Dash VN trên Discord hoặc thêm bot vào server của bạn!"
	/>
</svelte:head>

<div class="mt-[-50px]" in:fade={{ delay: 300, duration: 1000 }}>
	<img
		class="bgGradient absolute z-0 h-[650px] w-full object-cover"
		src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop"
		alt="Discord background"
	/>
</div>

<div class="relative mt-[50px] flex flex-col items-center">
	<BigTitle value={$_('discord_bot.page_title')} description={$_('discord_bot.page_description')} />
	<div class="mb-[80px] grid w-full max-w-[900px] gap-[20px] md:grid-cols-2">
		<Card.Root
			class="group relative overflow-hidden border-2 border-[#5865F2]/30 bg-gradient-to-br from-[#5865F2]/10 to-transparent transition-all hover:border-[#5865F2]/60 hover:shadow-lg hover:shadow-[#5865F2]/20"
		>
			<div
				class="absolute right-[-20px] top-[-20px] h-[100px] w-[100px] rounded-full bg-[#5865F2]/10 blur-2xl transition-all group-hover:bg-[#5865F2]/20"
			></div>
			<Card.Header class="pb-[15px]">
				<div
					class="mb-[10px] flex h-[60px] w-[60px] items-center justify-center rounded-xl bg-[#5865F2]/20"
				>
					<Users class="h-[32px] w-[32px] text-[#5865F2]" />
				</div>
				<Card.Title class="text-xl">{$_('discord_bot.server_title')}</Card.Title>
				<Card.Description class="text-base">
					{$_('discord_bot.server_description')}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<a href={SERVER_INVITE_URL} target="_blank" rel="noopener noreferrer" class="block">
					<Button class="w-full gap-[10px] bg-[#5865F2] text-base hover:bg-[#4752C4]">
						<Users class="h-5 w-5" />
						{$_('discord_bot.join_server')}
					</Button>
				</a>
			</Card.Content>
		</Card.Root>
		<Card.Root
			class="group relative overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent transition-all hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/20"
		>
			<div
				class="absolute right-[-20px] top-[-20px] h-[100px] w-[100px] rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20"
			></div>
			<Card.Header class="pb-[15px]">
				<div
					class="mb-[10px] flex h-[60px] w-[60px] items-center justify-center rounded-xl bg-emerald-500/20"
				>
					<Bot class="h-[32px] w-[32px] text-emerald-500" />
				</div>
				<Card.Title class="text-xl">{$_('discord_bot.bot_title')}</Card.Title>
				<Card.Description class="text-base">
					{$_('discord_bot.bot_description')}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<a href={BOT_INVITE_URL} target="_blank" rel="noopener noreferrer" class="block">
					<Button class="w-full gap-[10px] bg-emerald-600 text-base hover:bg-emerald-700">
						<Bot class="h-5 w-5" />
						{$_('discord_bot.add_button')}
					</Button>
				</a>
			</Card.Content>
		</Card.Root>
	</div>
	<div class="mb-[80px] w-full max-w-[900px]">
		<h2 class="mb-[10px] text-center text-2xl font-bold">{$_('discord_bot.features_title')}</h2>
		<p class="mb-[30px] text-center text-muted-foreground">{$_('discord_bot.features_subtitle')}</p>
		<div class="grid gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root class="text-center transition-all hover:bg-muted/50">
				<Card.Header>
					<div
						class="mx-auto mb-[10px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#5865F2]/20"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-[#5865F2]"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/></svg
						>
					</div>
					<Card.Title class="text-base">{$_('discord_bot.feature_level_search.title')}</Card.Title>
					<Card.Description>
						{$_('discord_bot.feature_level_search.description')}
					</Card.Description>
				</Card.Header>
			</Card.Root>
			<Card.Root class="text-center transition-all hover:bg-muted/50">
				<Card.Header>
					<div
						class="mx-auto mb-[10px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-amber-500/20"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-amber-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/></svg
						>
					</div>
					<Card.Title class="text-base">{$_('discord_bot.feature_leaderboard.title')}</Card.Title>
					<Card.Description>
						{$_('discord_bot.feature_leaderboard.description')}
					</Card.Description>
				</Card.Header>
			</Card.Root>
			<Card.Root class="text-center transition-all hover:bg-muted/50">
				<Card.Header>
					<div
						class="mx-auto mb-[10px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-emerald-500/20"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-emerald-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/></svg
						>
					</div>
					<Card.Title class="text-base">{$_('discord_bot.feature_player_profile.title')}</Card.Title
					>
					<Card.Description>{$_('discord_bot.feature_player_profile.description')}</Card.Description
					>
				</Card.Header>
			</Card.Root>
			<Card.Root class="text-center transition-all hover:bg-muted/50">
				<Card.Header>
					<div
						class="mx-auto mb-[10px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-rose-500/20"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-rose-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
					</div>
					<Card.Title class="text-base">{$_('discord_bot.feature_latest_records.title')}</Card.Title
					>
					<Card.Description>{$_('discord_bot.feature_latest_records.description')}</Card.Description
					>
				</Card.Header>
			</Card.Root>
		</div>
	</div>
	<div class="mb-[80px] w-full max-w-[900px]">
		<h2
			class="mb-[30px] flex items-center justify-center gap-[10px] text-center text-2xl font-bold"
		>
			<Terminal class="h-6 w-6" />
			{$_('discord_bot.commands_title')}
		</h2>

		<div class="flex flex-col gap-[15px]">
			{#each commands as command}
				<Card.Root class="overflow-hidden">
					<Card.Header class="pb-[10px]">
						<div class="flex flex-wrap items-center gap-[10px]">
							<Card.Title class="font-mono text-lg text-[#5865F2]">
								{command.name}
							</Card.Title>
							{#if command.supporterOnly}
								<span
									class="flex items-center gap-[5px] rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-[10px] py-[2px] text-xs font-semibold text-black"
								>
									<Gem class="h-3 w-3" />
									Supporter
								</span>
							{/if}
						</div>
						<Card.Description class="text-base">
							{command.description}
						</Card.Description>
					</Card.Header>
					{#if command.params.length > 0}
						<Card.Content class="pt-0">
							<div class="rounded-lg bg-muted/50 p-[15px]">
								<p class="mb-[10px] text-sm font-medium text-muted-foreground">
									{$_('discord_bot.command_params')}
								</p>
								<div class="flex flex-col gap-[8px]">
									{#each command.params as param}
										<div class="flex flex-wrap items-center gap-[8px]">
											<code
												class="rounded bg-muted px-[8px] py-[2px] font-mono text-sm text-foreground"
											>
												{param.name}
											</code>
											<span class="text-sm text-muted-foreground">
												{param.description}
											</span>
											{#if param.required}
												<span class="rounded bg-red-500/20 px-[6px] py-[1px] text-xs text-red-400">
													{$_('discord_bot.param_required')}
												</span>
											{:else}
												<span
													class="rounded bg-gray-500/20 px-[6px] py-[1px] text-xs text-gray-400"
												>
													{$_('discord_bot.param_optional')}
												</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						</Card.Content>
					{/if}
				</Card.Root>
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	.bgGradient {
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
	}
</style>
