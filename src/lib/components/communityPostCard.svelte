<script lang="ts">
	import { ThumbsUp, MessageSquare, Pin, Image, BookOpen, Megaphone, MessageCircle, Play, Trophy, Gamepad2, Star, ThumbsDown, Flag } from 'lucide-svelte';
	import { _, locale } from 'svelte-i18n';
	import { isActive } from '$lib/client/isSupporterActive';
	import { user } from '$lib/client';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';

	export let post: any;
	export let compact: boolean = false;

	const dispatch = createEventDispatcher();

	let likingPost = false;

	async function toggleLike() {
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}
		if (likingPost) return;
		likingPost = true;

		try {
			const token = await $user.token();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${post.id}/like`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				}
			);
			const result = await res.json();
			post.liked = result.liked;
			post.likes_count += result.liked ? 1 : -1;
			post = post; // trigger reactivity
		} catch {
			toast.error('Failed to like post');
		} finally {
			likingPost = false;
		}
	}

	const typeIcons: Record<string, any> = {
		discussion: MessageCircle,
		media: Image,
		guide: BookOpen,
		announcement: Megaphone,
		review: Star
	};

	const typeColors: Record<string, string> = {
		discussion: 'text-blue-500',
		media: 'text-purple-500',
		guide: 'text-emerald-500',
		announcement: 'text-amber-500',
		review: 'text-yellow-500'
	};

	const typeBgColors: Record<string, string> = {
		discussion: 'bg-blue-500/10',
		media: 'bg-purple-500/10',
		guide: 'bg-emerald-500/10',
		announcement: 'bg-amber-500/10',
		review: 'bg-yellow-500/10'
	};

	function timeAgo(dateStr: string) {
		const now = new Date();
		const date = new Date(dateStr);
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 60) return $locale === 'vi' ? 'Vừa xong' : 'Just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo`;
		const years = Math.floor(months / 12);
		return `${years}y`;
	}

	function getYouTubeThumbnail(url: string): string | null {
		if (!url) return null;
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
		return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
	}

	$: author = post?.players;
	$: TypeIcon = typeIcons[post?.type] || MessageCircle;
	$: thumbnail = post?.image_url || (post?.video_url ? getYouTubeThumbnail(post.video_url) : null);
	$: isMedia = post?.type === 'media';
</script>

{#if post}
	<a href="/community/{post.id}" class="communityPost" class:compact class:pinned={post.pinned} class:mediaPost={isMedia && thumbnail && !compact}>
		{#if post.pinned}
			<div class="pinnedBadge">
				<Pin class="h-3 w-3" />
				<span>{$_('community.pinned')}</span>
			</div>
		{/if}

		{#if isMedia && thumbnail && !compact}
			<!-- Media layout: full-width image on top, then title below -->
			<div class="mediaImage">
				<img src={thumbnail} alt="" loading="lazy" />
				{#if post.video_url && !post.image_url}
					<div class="videoOverlay">
						<Play class="h-6 w-6" />
					</div>
				{/if}
			</div>
			<div class="mediaBody">
				<div class="postAuthor">
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="authorLink" on:click|stopPropagation|preventDefault>
						{#if author}
							<PlayerLink player={author} showAvatar />
						{:else}
							<span>Unknown</span>
						{/if}
					</div>
					<span class="postTime">{timeAgo(post.created_at)}</span>
				</div>
				<h3 class="postTitle">{post.title}</h3>
			</div>
		{:else}
			<!-- Default layout: side-by-side -->
			<div class="postMain">
				<div class="postLeft">
					<div class="postAuthor">
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div class="authorLink" on:click|stopPropagation|preventDefault>
							{#if author}
							<PlayerLink player={author} showAvatar />
							{:else}
								<span>Unknown</span>
							{/if}
						</div>
						<span class="postTime">{timeAgo(post.created_at)}</span>
					</div>
					<div class="postContent">
						<div class="postTitleRow">
							<div class="typeBadge {typeBgColors[post.type]}">
								<svelte:component this={TypeIcon} class="h-3.5 w-3.5 {typeColors[post.type]}" />
								<span class={typeColors[post.type]}>{$_(`community.type.${post.type}`)}</span>
							</div>
							{#if post.type === 'review' && post.is_recommended !== null}
								<div class="recommendBadge" class:recommended={post.is_recommended} class:notRecommended={!post.is_recommended}>
									{#if post.is_recommended}
										<ThumbsUp class="h-3 w-3" />
									{:else}
										<ThumbsDown class="h-3 w-3" />
									{/if}
									<span>{post.is_recommended ? $_('community.review.recommended') : $_('community.review.not_recommended')}</span>
								</div>
							{/if}
							<h3 class="postTitle">{post.title}</h3>
						</div>
						{#if !compact && post.content}
							<div class="postExcerpt"><Markdown content={post.content.length > 300 ? post.content.slice(0, 300) + '...' : post.content} /></div>
						{/if}
					</div>
				</div>
				{#if thumbnail && !compact}
					<div class="postImage">
						<img src={thumbnail} alt="" loading="lazy" />
						{#if post.video_url && !post.image_url}
							<div class="videoOverlay">
								<Play class="h-5 w-5" />
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
		{#if post.attached_record || post.attached_level}
			<div class="attachmentBar">
				{#if post.attached_record}
					<div class="attachmentChip">
						<Trophy class="h-3.5 w-3.5 text-amber-500" />
						<span class="attachmentName">{post.attached_record.levelName}</span>
						<span class="attachmentMeta">{post.attached_record.progress}%</span>
					</div>
				{:else if post.attached_level}
					<div class="attachmentChip">
						<Gamepad2 class="h-3.5 w-3.5 text-emerald-500" />
						<span class="attachmentName">{post.attached_level.name}</span>
						<span class="attachmentMeta">{post.attached_level.creator}</span>
					</div>
				{/if}
			</div>
		{/if}
		<div class="postFooter">
			<div class="postStats">
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div class="postStat likeBtn" class:liked={post.liked} on:click|stopPropagation|preventDefault={toggleLike}>
					<ThumbsUp class="h-4 w-4" />
					<span>{post.likes_count}</span>
				</div>
				<div class="postStat">
					<MessageSquare class="h-4 w-4" />
					<span>{post.comments_count}</span>
				</div>
			</div>
			{#if $user.loggedIn && $user.data?.uid !== post.uid}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div class="reportBtn" on:click|stopPropagation|preventDefault={() => dispatch('report', post.id)} title={$_('community.report.button')}>
					<Flag class="h-3.5 w-3.5" />
				</div>
			{/if}
		</div>
	</a>
{:else}
	<!-- Skeleton -->
	<div class="communityPost skeleton">
		<div class="postMain">
			<div class="postLeft">
				<div class="postAuthor">
					<div class="skeletonLine w-24"></div>
					<div class="skeletonLine w-12"></div>
				</div>
				<div class="postContent">
					<div class="skeletonLine w-3/4 h-5"></div>
					<div class="skeletonLine w-full"></div>
				</div>
			</div>
		</div>
		<div class="postFooter">
			<div class="skeletonLine w-8"></div>
			<div class="skeletonLine w-8"></div>
		</div>
	</div>
{/if}

<style lang="scss">
	.communityPost {
		display: flex;
		flex-direction: column;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card));
		overflow: hidden;
		transition: all 0.2s ease;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		min-height: 220px;
		height: 100%;

		&:hover {
			border-color: hsl(var(--border) / 0.8);
			background: hsl(var(--accent) / 0.3);
			transform: translateY(-1px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}

		&.pinned {
			border-color: hsl(var(--primary) / 0.3);
			background: hsl(var(--primary) / 0.03);
		}

		&.compact {
			border-radius: 8px;
			min-height: auto;
			height: auto;
			.postContent { margin-top: 4px; }
		}
	}

	.pinnedBadge {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 16px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
		border-bottom: 1px solid hsl(var(--primary) / 0.1);
	}

	.postMain {
		display: flex;
		gap: 16px;
		padding: 16px;
		flex: 1;
		min-height: 0;
	}

	.postLeft {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.postAuthor {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.authorLink { font-size: 13px; }

	.postTime {
		font-size: 11px;
		color: hsl(var(--muted-foreground));
	}

	.postContent {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.postTitleRow {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.typeBadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.postTitle {
		font-weight: 600;
		font-size: 15px;
		line-height: 1.4;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.postExcerpt {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-height: 4.5em;

		:global(p) {
			margin: 0;
		}

		:global(img) {
			display: none;
		}

		:global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
			font-size: inherit;
			font-weight: inherit;
			margin: 0;
		}

		:global(pre) {
			display: none;
		}

		:global(ul), :global(ol) {
			margin: 0;
			padding-left: 16px;
		}
	}

	.postImage {
		width: 120px;
		height: 120px;
		max-height: 120px;
		flex-shrink: 0;
		border-radius: 8px;
		overflow: hidden;
		position: relative;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.videoOverlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.35);
		color: white;
	}

	/* Media post layout */
	.mediaPost {
		grid-row: span 2;

		.postFooter {
			border-top: none;
		}
	}

	.mediaImage {
		width: 100%;
		aspect-ratio: 16 / 9;
		max-height: 310px;
		overflow: hidden;
		position: relative;
		background: hsl(var(--muted));

		img {
			width: 100%;
			height: 100%;
			object-fit: contain;
		}
	}

	.mediaBody {
		padding: 12px 16px 4px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.postFooter {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 10px 16px;
		border-top: 1px solid hsl(var(--border) / 0.5);
		margin-top: auto;
	}

	.postStats {
		display: flex;
		gap: 16px;
	}

	.postStat {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		&.liked { color: hsl(var(--primary)); }

		&.likeBtn {
			cursor: pointer;
			border-radius: 6px;
			padding: 4px 8px;
			margin: -4px -8px;
			transition: all 0.15s;

			&:hover {
				color: hsl(var(--primary));
				background: hsl(var(--primary) / 0.1);
			}
		}
	}

	.reportBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 4px;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s;

		&:hover {
			color: hsl(0 84% 60%);
			background: hsl(0 84% 60% / 0.1);
		}
	}

	.communityPost:hover .reportBtn {
		opacity: 1;
	}

	/* Attachment bar */
	.attachmentBar {
		padding: 0 16px 0;
	}

	.attachmentChip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 6px;
		background: hsl(var(--muted) / 0.5);
		font-size: 12px;
		overflow: hidden;

		.attachmentName {
			font-weight: 500;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			min-width: 0;
		}

		.attachmentMeta {
			color: hsl(var(--muted-foreground));
			flex-shrink: 0;
		}
	}

	.skeleton { pointer-events: none; }

	.recommendBadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;

		&.recommended {
			background: rgba(34, 197, 94, 0.1);
			color: rgb(34, 197, 94);
		}

		&.notRecommended {
			background: rgba(239, 68, 68, 0.1);
			color: rgb(239, 68, 68);
		}
	}

	.skeletonLine {
		height: 14px;
		border-radius: 4px;
		background: hsl(var(--muted));
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	@media screen and (max-width: 640px) {
		.postImage { display: none; }
	}
</style>
