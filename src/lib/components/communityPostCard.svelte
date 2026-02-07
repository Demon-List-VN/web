<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { ThumbsUp, MessageSquare, Pin, Image, BookOpen, Megaphone, MessageCircle } from 'lucide-svelte';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';

	export let post: any;
	export let compact: boolean = false;

	const typeIcons: Record<string, any> = {
		discussion: MessageCircle,
		screenshot: Image,
		guide: BookOpen,
		announcement: Megaphone
	};

	const typeColors: Record<string, string> = {
		discussion: 'text-blue-500',
		screenshot: 'text-purple-500',
		guide: 'text-emerald-500',
		announcement: 'text-amber-500'
	};

	const typeBgColors: Record<string, string> = {
		discussion: 'bg-blue-500/10',
		screenshot: 'bg-purple-500/10',
		guide: 'bg-emerald-500/10',
		announcement: 'bg-amber-500/10'
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

	$: author = post?.players;
	$: TypeIcon = typeIcons[post?.type] || MessageCircle;
</script>

{#if post}
	<a href="/community/{post.id}" class="communityPost" class:compact class:pinned={post.pinned}>
		{#if post.pinned}
			<div class="pinnedBadge">
				<Pin class="h-3 w-3" />
				<span>{$_('community.pinned')}</span>
			</div>
		{/if}
		<div class="postMain">
			<div class="postLeft">
				<div class="postAuthor">
					<Avatar.Root class="h-8 w-8">
						<Avatar.Image src={author?.avatar} alt={author?.name} />
						<Avatar.Fallback>{author?.name?.charAt(0) || '?'}</Avatar.Fallback>
					</Avatar.Root>
					<div class="authorInfo">
						<span class="authorName" class:supporter={isActive(author?.supporterUntil)}>
							{author?.name || 'Unknown'}
						</span>
						<span class="postTime">{timeAgo(post.created_at)}</span>
					</div>
				</div>
				<div class="postContent">
					<div class="postTitleRow">
						<div class="typeBadge {typeBgColors[post.type]}">
							<svelte:component this={TypeIcon} class="h-3.5 w-3.5 {typeColors[post.type]}" />
							<span class={typeColors[post.type]}>{$_(`community.type.${post.type}`)}</span>
						</div>
						<h3 class="postTitle">{post.title}</h3>
					</div>
					{#if !compact && post.content}
						<p class="postExcerpt">{post.content.slice(0, 200)}{post.content.length > 200 ? '...' : ''}</p>
					{/if}
				</div>
			</div>
			{#if post.image_url && !compact}
				<div class="postImage">
					<img src={post.image_url} alt="" loading="lazy" />
				</div>
			{/if}
		</div>
		<div class="postFooter">
			<div class="postStat" class:liked={post.liked}>
				<ThumbsUp class="h-4 w-4" />
				<span>{post.likes_count}</span>
			</div>
			<div class="postStat">
				<MessageSquare class="h-4 w-4" />
				<span>{post.comments_count}</span>
			</div>
		</div>
	</a>
{:else}
	<!-- Skeleton -->
	<div class="communityPost skeleton">
		<div class="postMain">
			<div class="postLeft">
				<div class="postAuthor">
					<div class="skeletonAvatar"></div>
					<div class="authorInfo">
						<div class="skeletonLine w-24"></div>
						<div class="skeletonLine w-12"></div>
					</div>
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

			.postContent {
				margin-top: 4px;
			}
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

	.authorInfo {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.authorName {
		font-weight: 600;
		font-size: 13px;
		line-height: 1.3;

		&.supporter {
			color: #eab308;
		}
	}

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
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.postImage {
		width: 120px;
		height: 80px;
		flex-shrink: 0;
		border-radius: 8px;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.postFooter {
		display: flex;
		gap: 16px;
		padding: 10px 16px;
		border-top: 1px solid hsl(var(--border) / 0.5);
	}

	.postStat {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));

		&.liked {
			color: hsl(var(--primary));
		}
	}

	/* Skeleton */
	.skeleton {
		pointer-events: none;
	}

	.skeletonAvatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: hsl(var(--muted));
		animation: pulse 1.5s ease-in-out infinite;
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
		.postImage {
			display: none;
		}
	}
</style>
