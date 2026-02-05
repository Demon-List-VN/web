<script lang="ts">
	import Clock from 'svelte-radix/Clock.svelte';
	import ExternalLink from 'svelte-radix/ExternalLink.svelte';
	import Star from 'svelte-radix/Star.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { _ } from 'svelte-i18n';

	export let data: any;

	function isEventStarted() {
		return new Date(data.start) <= new Date();
	}

	function getInterval(end: string | null) {
		if (!end) {
			return $_("events.permanent");
		}

		if (!isEventStarted()) {
			return `${$_('events.starts_at')} ${new Date(data.start).toLocaleString('vi-vn')}`;
		}

		const second = (new Date(end).getTime() - new Date().getTime()) / 1000;

		if (second < 0) {
			return `${$_('events.ended_at')} ${new Date(end).toLocaleString('vi-vn')}`;
		}

		const day = Math.floor(second / 86400);
		const hour = Math.floor((second - day * 86400) / 3600);
		const minute = Math.floor((second - day * 86400 - hour * 3600) / 60);

		return `${day}d ${hour}h ${minute}m`;
	}
</script>
{#if data === null}
	<div class="p-1">
		<div class="promotion">
			<div class="promotionContent">
				<div class="flex flex-col gap-[10px]">
					<Skeleton class="h-[20px] w-[75px]" />
					<Skeleton class="h-[45px] w-[200px]" />
					<Skeleton class="h-[25px] w-[150px]" />
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="p-1">
		<div class="promotion" style={`background-image: url('${data.imgUrl ? data.imgUrl : `https://cdn.gdvn.net/event-banner/${data.id}.webp`}')`}>
			<div class="promotionContent">
				<div class="flex gap-[10px]">
					<div class="period">
						<Clock size={16} />
						{getInterval(data.end)}
					</div>
					{#if data.isRanked}
						<div class="period">
							{$_('events.ranked')}
						</div>
					{/if}
					{#if data.isSupporterOnly}
						<div class="period">
							<Star size={16} />
							{$_('events.supporter_only')}
						</div>
					{/if}
					{#if data.exp}
						<div class="period">
							{data.exp} EXP
						</div>
					{/if}
				</div>
				<h2>{data.title}</h2>
				{#if data.redirect && data.isExternal}
					<a href={data.redirect} target="_blank">
						<div class="flex gap-[10px]">
							<ExternalLink />
							{data.redirect}
						</div>
					</a>
				{/if}
				<p class="desc">{data.description}</p>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.desc {
		width: 650px;
		max-width: 100%;
	}

	.promotion {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background-position: center;
		aspect-ratio: 40 / 10;
		background-size: cover;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		color: white;
		min-height: 250px;
		max-width: 100%;

		.period {
			background-color: white;
			width: fit-content;
			padding-inline: 8px;
			color: black;
			font-weight: 600;
			text-shadow: none;
			border-radius: 10px;
			display: flex;
			align-items: center;
			gap: 5px;
			line-height: 0;
			padding-top: 3px;
			padding-bottom: 3px;
		}

		.promotionContent {
			margin-top: auto;
			height: 175px;
			padding: 21px;
			text-shadow: black 1px 0 10px;
		}

		h2 {
			font-weight: bold;
			font-size: 28px;
		}
	}
</style>
