<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import {
		ThumbsUp,
		MessageSquare,
		Pin,
		Trash2,
		ArrowLeft,
		Image,
		BookOpen,
		Megaphone,
		MessageCircle,
		Send,
		Flag,
		Trophy,
		Gamepad2,
		ExternalLink
	} from 'lucide-svelte';

	let post: any = null;
	let comments: any[] | null = null;
	let newComment = '';
	let submittingComment = false;
	let likingPost = false;

	// Report state
	let reportDialogOpen = false;
	let reportTarget: { type: 'post' | 'comment'; id: number } | null = null;
	let reportReason = 'inappropriate';
	let reportDescription = '';
	let submittingReport = false;

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

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString($locale || 'vi-VN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

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
		return formatDate(dateStr);
	}

	async function getHeaders() {
		const token = await $user.token();
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (token) headers['Authorization'] = `Bearer ${token}`;
		return headers;
	}

	async function fetchPost() {
		const postId = $page.params.id;
		const headers = await getHeaders();
		delete headers['Content-Type'];

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/posts/${postId}`, {
				headers
			});
			if (!res.ok) throw new Error();
			post = await res.json();
		} catch {
			post = null;
		}
	}

	async function fetchComments() {
		const postId = $page.params.id;
		const headers = await getHeaders();
		delete headers['Content-Type'];

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${postId}/comments`,
				{ headers }
			);
			comments = await res.json();
		} catch {
			comments = [];
		}
	}

	async function toggleLike() {
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}
		if (likingPost) return;
		likingPost = true;

		const headers = await getHeaders();

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${post.id}/like`,
				{ method: 'POST', headers }
			);
			const result = await res.json();
			post.liked = result.liked;
			post.likes_count += result.liked ? 1 : -1;
		} catch {
			toast.error('Failed to like post');
		} finally {
			likingPost = false;
		}
	}

	async function submitComment() {
		if (!newComment.trim()) return;
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}

		submittingComment = true;
		const headers = await getHeaders();

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${post.id}/comments`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify({ content: newComment })
				}
			);

			if (!res.ok) throw new Error();

			const comment = await res.json();
			comments = [...(comments || []), comment];
			post.comments_count++;
			newComment = '';
			toast.success($_('community.comment.success'));
		} catch {
			toast.error($_('community.comment.error'));
		} finally {
			submittingComment = false;
		}
	}

	async function deleteComment(commentId: number) {
		const headers = await getHeaders();

		try {
			await fetch(`${import.meta.env.VITE_API_URL}/community/comments/${commentId}`, {
				method: 'DELETE',
				headers
			});
			comments = (comments || []).filter((c) => c.id !== commentId);
			post.comments_count--;
		} catch {
			toast.error('Failed to delete comment');
		}
	}

	async function toggleCommentLike(comment: any) {
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}

		const headers = await getHeaders();

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/comments/${comment.id}/like`,
				{ method: 'POST', headers }
			);
			const result = await res.json();
			comment.liked = result.liked;
			comment.likes_count += result.liked ? 1 : -1;
			comments = comments;
		} catch {
			toast.error('Failed to like comment');
		}
	}

	async function deletePost() {
		if (!confirm($_('community.delete_confirm'))) return;
		const headers = await getHeaders();

		try {
			await fetch(`${import.meta.env.VITE_API_URL}/community/posts/${post.id}`, {
				method: 'DELETE',
				headers
			});
			toast.success($_('community.deleted'));
			goto('/community');
		} catch {
			toast.error('Failed to delete post');
		}
	}

	async function togglePin() {
		const headers = await getHeaders();

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${post.id}/pin`,
				{ method: 'POST', headers }
			);
			const updated = await res.json();
			post.pinned = updated.pinned;
		} catch {
			toast.error('Failed to pin/unpin');
		}
	}

	function openReport(type: 'post' | 'comment', id: number) {
		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}
		reportTarget = { type, id };
		reportReason = 'inappropriate';
		reportDescription = '';
		reportDialogOpen = true;
	}

	async function submitReport() {
		if (!reportTarget) return;
		submittingReport = true;
		const headers = await getHeaders();

		try {
			const endpoint = reportTarget.type === 'post'
				? `${import.meta.env.VITE_API_URL}/community/posts/${reportTarget.id}/report`
				: `${import.meta.env.VITE_API_URL}/community/comments/${reportTarget.id}/report`;

			const res = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					reason: reportReason,
					description: reportDescription || undefined
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to report');
			}

			toast.success($_('community.report.success'));
			reportDialogOpen = false;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			submittingReport = false;
		}
	}

	onMount(() => {
		fetchPost();
		fetchComments();
	});

	$: author = post?.players;
	$: TypeIcon = post ? typeIcons[post.type] || MessageCircle : MessageCircle;
	$: canDelete =
		$user.loggedIn && post && ($user.data?.uid === post.uid || $user.data?.isAdmin);
	$: canPin = $user.loggedIn && $user.data?.isAdmin;

	function getYouTubeId(url: string): string | null {
		if (!url) return null;
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
		return match ? match[1] : null;
	}

	$: youtubeId = post?.video_url ? getYouTubeId(post.video_url) : null;
</script>

<svelte:head>
	<title>{post?.title || $_('community.title')} - Geometry Dash VN</title>
</svelte:head>

<div class="postPage">
	<!-- Back nav -->
	<div class="backNav">
		<a href="/community" class="backLink">
			<ArrowLeft class="h-4 w-4" />
			<span>{$_('community.title')}</span>
		</a>
	</div>

	{#if post}
		<article class="postArticle">
			<!-- Post Header -->
			<div class="postHeader">
				{#if post.pinned}
					<div class="pinnedIndicator">
						<Pin class="h-3.5 w-3.5" />
						<span>{$_('community.pinned')}</span>
					</div>
				{/if}

				<div class="typeBadge {typeBgColors[post.type]}">
					<svelte:component this={TypeIcon} class="h-3.5 w-3.5 {typeColors[post.type]}" />
					<span class={typeColors[post.type]}>{$_(`community.type.${post.type}`)}</span>
				</div>

				<h1 class="postTitle">{post.title}</h1>

				<div class="postMeta">
					<div class="authorChip">
						{#if author}
							<PlayerLink player={author} />
						{:else}
							<span>Unknown</span>
						{/if}
					</div>
					<span class="metaDot">·</span>
					<span class="metaDate">{formatDate(post.created_at)}</span>
					{#if post.updated_at !== post.created_at}
						<span class="metaDot">·</span>
						<span class="metaEdited">({$_('community.edited')})</span>
					{/if}
				</div>
			</div>

			<!-- Post Body -->
			<div class="postBody">
				{#if post.image_url}
					<div class="postImageFull">
						<img src={post.image_url} alt="" />
					</div>
				{/if}
				{#if youtubeId}
					<div class="youtubeEmbed">
						<iframe
							src="https://www.youtube.com/embed/{youtubeId}"
							title="YouTube video"
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowfullscreen
						></iframe>
					</div>
				{/if}

				<!-- Attached Record -->
				{#if post.attached_record}
					<div class="attachedCard">
						<Trophy class="h-5 w-5 text-amber-500" />
						<div class="attachedInfo">
							<strong>{post.attached_record.levelName}</strong>
							<span class="attachedMeta">
								{$_('community.attachment.by')} {post.attached_record.creator} · {post.attached_record.progress}%
								{#if post.attached_record.mobile} · 📱{/if}
							</span>
						</div>
						{#if post.attached_record.videoLink}
							<a href={post.attached_record.videoLink} target="_blank" rel="noopener" class="attachedLink">
								<ExternalLink class="h-4 w-4" />
							</a>
						{/if}
					</div>
				{/if}

				<!-- Attached Level -->
				{#if post.attached_level}
					<div class="attachedCard">
						<Gamepad2 class="h-5 w-5 text-emerald-500" />
						<div class="attachedInfo">
							<strong>{post.attached_level.name}</strong>
							<span class="attachedMeta">
								{$_('community.attachment.by')} {post.attached_level.creator}
								{#if post.attached_level.isPlatformer} · Platformer{/if}
							</span>
						</div>
						<a href="/level/{post.attached_level.id}" class="attachedLink">
							<ExternalLink class="h-4 w-4" />
						</a>
					</div>
				{/if}

				<div class="postText">
					{#if post.type === 'announcement'}
						<Markdown content={post.content} />
					{:else}
						{post.content}
					{/if}
				</div>
			</div>

			<!-- Post Actions -->
			<div class="postActions">
				<div class="actionGroup">
					<button class="actionBtn" class:liked={post.liked} on:click={toggleLike}>
						<ThumbsUp class="h-4 w-4" />
						<span>{post.likes_count}</span>
					</button>
					<div class="actionBtn">
						<MessageSquare class="h-4 w-4" />
						<span>{post.comments_count}</span>
					</div>
				</div>
				<div class="actionGroup">
					{#if canPin}
						<button class="actionBtn" on:click={togglePin}>
							<Pin class="h-4 w-4" />
							<span>{post.pinned ? $_('community.unpin') : $_('community.pin')}</span>
						</button>
					{/if}
					{#if $user.loggedIn && $user.data?.uid !== post.uid}
						<button class="actionBtn" on:click={() => openReport('post', post.id)}>
							<Flag class="h-4 w-4" />
							<span>{$_('community.report.button')}</span>
						</button>
					{/if}
					{#if canDelete}
						<button class="actionBtn danger" on:click={deletePost}>
							<Trash2 class="h-4 w-4" />
							<span>{$_('community.delete')}</span>
						</button>
					{/if}
				</div>
			</div>
		</article>

		<!-- Comments Section -->
		<section class="commentsSection">
			<h2 class="commentsTitle">
				<MessageSquare class="h-5 w-5" />
				{$_('community.comments')} ({post.comments_count})
			</h2>

			<!-- Comment Input -->
			{#if $user.loggedIn}
				<div class="commentInput">
					<div class="commentForm">
						<Textarea
							bind:value={newComment}
							placeholder={$_('community.comment.placeholder')}
							rows={2}
						/>
						<Button
							size="sm"
							on:click={submitComment}
							disabled={submittingComment || !newComment.trim()}
						>
							<Send class="mr-1 h-3.5 w-3.5" />
							{submittingComment ? $_('community.comment.submitting') : $_('community.comment.submit')}
						</Button>
					</div>
				</div>
			{:else}
				<p class="loginPrompt">{$_('community.login_to_comment')}</p>
			{/if}

			<!-- Comments List -->
			<div class="commentsList">
				{#if comments}
					{#if comments.length > 0}
						{#each comments as comment}
							<div class="commentItem">
								<div class="commentBody">
									<div class="commentHeader">
										<div class="commentAuthorLink">
											{#if comment.players}
												<PlayerLink player={comment.players} />
											{:else}
												<span>Unknown</span>
											{/if}
										</div>
										<span class="commentTime">{timeAgo(comment.created_at)}</span>
									</div>
									<p class="commentText">{comment.content}</p>
									<div class="commentActions">
										<button
											class="commentAction"
											class:liked={comment.liked}
											on:click={() => toggleCommentLike(comment)}
										>
											<ThumbsUp class="h-3.5 w-3.5" />
											<span>{comment.likes_count}</span>
										</button>
										{#if $user.loggedIn && $user.data?.uid !== comment.uid}
											<button
												class="commentAction"
												on:click={() => openReport('comment', comment.id)}
											>
												<Flag class="h-3.5 w-3.5" />
											</button>
										{/if}
										{#if $user.loggedIn && ($user.data?.uid === comment.uid || $user.data?.isAdmin)}
											<button
												class="commentAction danger"
												on:click={() => deleteComment(comment.id)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{:else}
						<p class="noComments">{$_('community.comment.none')}</p>
					{/if}
				{:else}
					{#each { length: 3 } as _}
						<div class="commentItem skeleton">
							<div class="skeletonCircle"></div>
							<div class="commentBody">
								<div class="skeletonLine w-32"></div>
								<div class="skeletonLine w-full"></div>
								<div class="skeletonLine w-2/3"></div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	{:else}
		<!-- Loading skeleton -->
		<div class="postArticle skeleton">
			<div class="postHeader">
				<div class="skeletonLine w-20 h-6"></div>
				<div class="skeletonLine w-3/4 h-8 mt-3"></div>
				<div class="flex gap-2 mt-3">
					<div class="skeletonCircle"></div>
					<div class="skeletonLine w-24"></div>
					<div class="skeletonLine w-32"></div>
				</div>
			</div>
			<div class="postBody">
				<div class="skeletonLine w-full"></div>
				<div class="skeletonLine w-full"></div>
				<div class="skeletonLine w-2/3"></div>
			</div>
		</div>
	{/if}
</div>

<!-- Report Dialog -->
<Dialog.Root bind:open={reportDialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$_('community.report.title')}</Dialog.Title>
			<Dialog.Description>{$_('community.report.description')}</Dialog.Description>
		</Dialog.Header>

		<div class="reportForm">
			<div class="reportField">
				<span class="reportLabel">{$_('community.report.reason')}</span>
				<Select.Root
					onSelectedChange={(v) => {
						if (v) reportReason = String(v.value);
					}}
				>
					<Select.Trigger>
						<Select.Value placeholder={$_('community.report.reasons.inappropriate')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="inappropriate">{$_('community.report.reasons.inappropriate')}</Select.Item>
						<Select.Item value="spam">{$_('community.report.reasons.spam')}</Select.Item>
						<Select.Item value="harassment">{$_('community.report.reasons.harassment')}</Select.Item>
						<Select.Item value="misinformation">{$_('community.report.reasons.misinformation')}</Select.Item>
						<Select.Item value="other">{$_('community.report.reasons.other')}</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="reportField">
				<label for="report-desc">{$_('community.report.details')} ({$_('community.create.optional')})</label>
				<Textarea id="report-desc" bind:value={reportDescription} placeholder={$_('community.report.details_placeholder')} rows={3} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (reportDialogOpen = false)}>
				{$_('general.close')}
			</Button>
			<Button variant="destructive" on:click={submitReport} disabled={submittingReport}>
				{submittingReport ? $_('community.report.submitting') : $_('community.report.submit')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.postPage {
		max-width: 820px;
		margin: 0 auto;
		padding: 24px 20px 60px;
	}

	.backNav {
		margin-bottom: 20px;
	}

	.backLink {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: color 0.15s;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	.postArticle {
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card));
		overflow: hidden;
	}

	.postHeader {
		padding: 24px 24px 0;
	}

	.pinnedIndicator {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: hsl(var(--primary));
		margin-bottom: 8px;
	}

	.typeBadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		text-transform: capitalize;
		margin-bottom: 10px;
	}

	.postTitle {
		font-size: 24px;
		font-weight: 700;
		line-height: 1.3;
		margin: 0 0 12px;
	}

	.postMeta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.authorChip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.supporter {
		color: #eab308;
	}

	.metaDot {
		color: hsl(var(--muted-foreground) / 0.5);
	}

	.metaEdited {
		font-style: italic;
	}

	.postBody {
		padding: 20px 24px;
	}

	.postImageFull {
		margin-bottom: 20px;
		border-radius: 8px;
		overflow: hidden;

		img {
			width: 100%;
			max-height: 500px;
			object-fit: contain;
			background: hsl(var(--muted));
		}
	}

	.youtubeEmbed {
		position: relative;
		width: 100%;
		padding-bottom: 56.25%;
		margin-bottom: 20px;
		border-radius: 8px;
		overflow: hidden;

		iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	}

	.postText {
		font-size: 15px;
		line-height: 1.7;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.postActions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 24px;
		border-top: 1px solid hsl(var(--border));
	}

	.actionGroup {
		display: flex;
		gap: 4px;
	}

	.actionBtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			background: hsl(var(--muted));
			color: hsl(var(--foreground));
		}

		&.liked {
			color: hsl(var(--primary));
		}

		&.danger:hover {
			color: hsl(0 84% 60%);
			background: hsl(0 84% 60% / 0.1);
		}
	}

	/* Comments */
	.commentsSection {
		margin-top: 24px;
	}

	.commentsTitle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 20px;
	}

	.commentInput {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
	}

	.commentForm {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-end;
	}

	.loginPrompt {
		font-size: 14px;
		color: hsl(var(--muted-foreground));
		margin-bottom: 20px;
	}

	.commentsList {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.commentItem {
		display: flex;
		gap: 12px;
		padding: 14px 0;
		border-bottom: 1px solid hsl(var(--border) / 0.4);

		&:last-child {
			border-bottom: none;
		}
	}

	.commentAvatar {
		flex-shrink: 0;
	}

	.commentBody {
		flex: 1;
		min-width: 0;
	}

	.commentHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.commentAuthor {
		font-weight: 600;
		font-size: 13px;
		text-decoration: none;
		color: hsl(var(--foreground));

		&.supporter {
			color: #eab308;
		}

		&:hover {
			text-decoration: underline;
		}
	}

	.commentAuthorLink {
		font-weight: 600;
		font-size: 13px;
	}

	.commentTime {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.commentText {
		font-size: 14px;
		line-height: 1.5;
		margin: 0 0 6px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.commentActions {
		display: flex;
		gap: 8px;
	}

	.commentAction {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			background: hsl(var(--muted));
		}

		&.liked {
			color: hsl(var(--primary));
		}

		&.danger:hover {
			color: hsl(0 84% 60%);
		}
	}

	.noComments {
		text-align: center;
		padding: 32px 0;
		font-size: 14px;
		color: hsl(var(--muted-foreground));
	}

	/* Skeleton */
	.skeleton {
		pointer-events: none;
	}

	.skeletonCircle {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: hsl(var(--muted));
		animation: pulse 1.5s ease-in-out infinite;
		flex-shrink: 0;
	}

	.skeletonLine {
		height: 14px;
		border-radius: 4px;
		background: hsl(var(--muted));
		animation: pulse 1.5s ease-in-out infinite;
		margin-bottom: 6px;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@media screen and (max-width: 640px) {
		.postPage {
			padding: 16px 12px 40px;
		}

		.postHeader {
			padding: 16px 16px 0;
		}

		.postBody {
			padding: 16px;
		}

		.postActions {
			padding: 10px 16px;
			flex-direction: column;
			gap: 8px;
		}

		.postTitle {
			font-size: 20px;
		}
	}

	/* Attached Record/Level Card */
	.attachedCard {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.3);
		margin-bottom: 16px;

		.attachedInfo {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 2px;

			strong {
				font-size: 14px;
			}

			.attachedMeta {
				font-size: 12px;
				color: hsl(var(--muted-foreground));
			}
		}

		.attachedLink {
			padding: 6px;
			border-radius: 6px;
			color: hsl(var(--muted-foreground));
			transition: all 0.15s;

			&:hover {
				background: hsl(var(--muted));
				color: hsl(var(--foreground));
			}
		}
	}

	/* Report Dialog */
	.reportForm {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 8px 0;
	}

	.reportField {
		display: flex;
		flex-direction: column;
		gap: 6px;

		label, .reportLabel {
			font-size: 13px;
			font-weight: 500;
		}
	}
</style>
