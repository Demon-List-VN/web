<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import ReportDialog from './ReportDialog.svelte';
	import MentionDropdown from './MentionDropdown.svelte';
	import LevelPicker from './LevelPicker.svelte';
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
		ExternalLink,
		Play,
		Star,
		ThumbsDown,
		X
	} from 'lucide-svelte';

	let post: any = null;
	let comments: any[] | null = null;
	let newComment = '';
	let submittingComment = false;
	let likingPost = false;

	// Report state
	let reportDialogOpen = false;
	let reportTarget: { type: 'post' | 'comment'; id: number } | null = null;

	// Record detail dialog state
	let recordDialogOpen = false;
	let recordDetailUid = '';
	let recordDetailLevelID = 0;

	// @ mention state
	let showMentionDropdown = false;
	let mentionQuery = '';
	let mentionSuggestions: any[] = [];
	let mentionTimer: ReturnType<typeof setTimeout>;
	let mentionIndex = 0;
	let commentTextarea: HTMLTextAreaElement;

	// Level tagging state
	let showLevelPicker = false;
	let commentAttachedLevel: any = null;

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
			const body: any = { content: newComment };
			if (commentAttachedLevel) {
				body.attached_level = commentAttachedLevel;
			}

			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts/${post.id}/comments`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(body)
				}
			);

			if (!res.ok) throw new Error();

			const comment = await res.json();
			comments = [...(comments || []), comment];
			post.comments_count++;
			newComment = '';
			commentAttachedLevel = null;
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
		reportDialogOpen = true;
	}

	// @ Mention handling
	function handleCommentInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		const value = textarea.value;
		const cursorPos = textarea.selectionStart;

		// Find @ trigger
		const beforeCursor = value.slice(0, cursorPos);
		const atMatch = beforeCursor.match(/@(\w*)$/);

		if (atMatch) {
			mentionQuery = atMatch[1];
			if (mentionQuery.length >= 1) {
				clearTimeout(mentionTimer);
				mentionTimer = setTimeout(() => searchMentions(mentionQuery), 300);
			} else {
				showMentionDropdown = true;
				mentionSuggestions = [];
			}
		} else {
			showMentionDropdown = false;
			mentionSuggestions = [];
		}
	}

	async function searchMentions(query: string) {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/players/search?q=${encodeURIComponent(query)}`);
			mentionSuggestions = await res.json();
			showMentionDropdown = mentionSuggestions.length > 0;
			mentionIndex = 0;
		} catch {
			mentionSuggestions = [];
			showMentionDropdown = false;
		}
	}

	function selectMention(player: any) {
		const cursorPos = commentTextarea.selectionStart;
		const beforeCursor = newComment.slice(0, cursorPos);
		const afterCursor = newComment.slice(cursorPos);
		const atIndex = beforeCursor.lastIndexOf('@');

		newComment = beforeCursor.slice(0, atIndex) + `@[${player.name}](${player.uid}) ` + afterCursor;
		showMentionDropdown = false;
		mentionSuggestions = [];

		// Refocus textarea
		setTimeout(() => {
			commentTextarea.focus();
			const newPos = atIndex + `@[${player.name}](${player.uid}) `.length;
			commentTextarea.setSelectionRange(newPos, newPos);
		}, 0);
	}

	function handleCommentKeydown(e: KeyboardEvent) {
		if (showMentionDropdown && mentionSuggestions.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				mentionIndex = (mentionIndex + 1) % mentionSuggestions.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				mentionIndex = (mentionIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				selectMention(mentionSuggestions[mentionIndex]);
			} else if (e.key === 'Escape') {
				showMentionDropdown = false;
			}
		}
	}

	// Level tagging for comments
	function toggleLevelPicker() {
		showLevelPicker = !showLevelPicker;
	}

	function handleLevelSelect(e: CustomEvent<any>) {
		commentAttachedLevel = e.detail;
	}

	function clearCommentLevel() {
		commentAttachedLevel = null;
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
	<title>{post?.title || 'Cộng đồng'} - Geometry Dash VN</title>
	{#if post}
		<meta property="og:title" content="{post.title} - Geometry Dash VN" />
		<meta property="og:type" content="article" />
		<meta property="og:url" content="{import.meta.env.VITE_SITE_URL || 'https://demonlist.vn'}/community/{post.id}" />
		{#if post.content}
			<meta property="og:description" content="{post.content.slice(0, 160)}" />
		{/if}
		{#if post.image_url}
			<meta property="og:image" content="{post.image_url}" />
		{:else if youtubeId}
			<meta property="og:image" content="https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg" />
		{/if}
		<meta property="og:site_name" content="Geometry Dash VN" />
		<meta property="article:published_time" content="{post.created_at}" />
		{#if post.updated_at !== post.created_at}
			<meta property="article:modified_time" content="{post.updated_at}" />
		{/if}
		{#if post.players}
			<meta property="article:author" content="{post.players.name}" />
		{/if}
		<meta name="twitter:card" content="{post.image_url || youtubeId ? 'summary_large_image' : 'summary'}" />
		<meta name="twitter:title" content="{post.title} - Geometry Dash VN" />
		{#if post.content}
			<meta name="twitter:description" content="{post.content.slice(0, 160)}" />
		{/if}
		{#if post.image_url}
			<meta name="twitter:image" content="{post.image_url}" />
		{:else if youtubeId}
			<meta name="twitter:image" content="https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg" />
		{/if}
	{/if}
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

				{#if post.type === 'review' && post.is_recommended !== null && post.is_recommended !== undefined}
					<div class="recommendBadgeDetail" class:recommended={post.is_recommended} class:notRecommended={!post.is_recommended}>
						{#if post.is_recommended}
							<ThumbsUp class="h-4 w-4" />
							<span>{$_('community.review.recommended')}</span>
						{:else}
							<ThumbsDown class="h-4 w-4" />
							<span>{$_('community.review.not_recommended')}</span>
						{/if}
					</div>
				{/if}

				<h1 class="postTitle">{post.title}</h1>

				<div class="postMeta">
					<div class="authorChip">
						{#if author}
							<PlayerLink player={author} showAvatar />
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
				{:else if youtubeId && !post.image_url}
					<a href={post.video_url} target="_blank" rel="noopener" class="ytThumbnailFull">
						<img src="https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg" alt="" />
						<div class="ytThumbnailPlay">
							<Play class="h-10 w-10" />
						</div>
					</a>
				{/if}
				{#if youtubeId && post.image_url}
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
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="attachedCard clickable" on:click={() => (recordDialogOpen = true)}>
						<Trophy class="h-5 w-5 text-amber-500" />
						<div class="attachedInfo">
							<strong>{post.attached_record.levelName}</strong>
							<span class="attachedMeta">
								{$_('community.attachment.by')} {post.attached_record.creator} · {post.attached_record.progress}%
								{#if post.attached_record.mobile} · 📱{/if}
							</span>
						</div>
						{#if post.attached_record.videoLink}
							<a href={post.attached_record.videoLink} target="_blank" rel="noopener" class="attachedLink" on:click|stopPropagation>
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

				{#if post.content}
					<div class="postText">
						<Markdown content={post.content} />
					</div>
				{/if}
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
						<div class="commentInputWrapper">
							<textarea
								class="commentTextarea"
								bind:value={newComment}
								bind:this={commentTextarea}
								placeholder={$_('community.comment.placeholder')}
								rows={2}
								on:input={handleCommentInput}
								on:keydown={handleCommentKeydown}
							></textarea>
							<MentionDropdown
								show={showMentionDropdown}
								suggestions={mentionSuggestions}
								activeIndex={mentionIndex}
								on:select={(e) => selectMention(e.detail)}
							/>
						</div>
						{#if commentAttachedLevel}
							<div class="commentLevelTag">
								<Gamepad2 class="h-3.5 w-3.5 text-emerald-500" />
								<span>{commentAttachedLevel.name}</span>
								<button class="clearLevelBtn" on:click={clearCommentLevel}>
									<X class="h-3 w-3" />
								</button>
							</div>
						{/if}
						<div class="commentActions">
							<button
								class="commentToolBtn"
								on:click={toggleLevelPicker}
								title={$_('community.comment.attach_level')}
							>
								<Gamepad2 class="h-4 w-4" />
							</button>
							<Button
								size="sm"
								on:click={submitComment}
								disabled={submittingComment || !newComment.trim()}
							>
								<Send class="mr-1 h-3.5 w-3.5" />
								{submittingComment ? $_('community.comment.submitting') : $_('community.comment.submit')}
							</Button>
						</div>
						<LevelPicker bind:show={showLevelPicker} on:select={handleLevelSelect} />
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
												<PlayerLink player={comment.players} showAvatar />
											{:else}
												<span>Unknown</span>
											{/if}
										</div>
										<span class="commentTime">{timeAgo(comment.created_at)}</span>
									</div>
									<p class="commentText"><Markdown content={comment.content} /></p>
									{#if comment.attached_level}
										<a href="/level/{comment.attached_level.id}" class="commentLevelAttachment">
											<Gamepad2 class="h-3.5 w-3.5 text-emerald-500" />
											<span>{comment.attached_level.name}</span>
											<span class="attachedMeta">{comment.attached_level.creator}</span>
										</a>
									{/if}
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

<!-- Record Detail -->
{#if post?.attached_record}
	<RecordDetail
		uid={post.uid}
		levelID={post.attached_record.levelid}
		bind:open={recordDialogOpen}
	/>
{/if}

<!-- Report Dialog -->
<ReportDialog bind:open={reportDialogOpen} target={reportTarget} />

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

	.recommendBadgeDetail {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 10px;

		&.recommended {
			background: rgba(34, 197, 94, 0.1);
			color: rgb(34, 197, 94);
		}

		&.notRecommended {
			background: rgba(239, 68, 68, 0.1);
			color: rgb(239, 68, 68);
		}
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

	.ytThumbnailFull {
		display: block;
		position: relative;
		margin-bottom: 20px;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;

		img {
			width: 100%;
			max-height: 500px;
			object-fit: contain;
			background: hsl(var(--muted));
		}

		.ytThumbnailPlay {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 64px;
			height: 64px;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.6);
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			transition: background 0.15s;
		}

		&:hover .ytThumbnailPlay {
			background: rgba(255, 0, 0, 0.85);
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

		&.clickable {
			cursor: pointer;
			transition: all 0.15s;

			&:hover {
				background: hsl(var(--muted) / 0.5);
				border-color: hsl(var(--primary) / 0.3);
			}
		}

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

	/* Mention dropdown */
	.commentInputWrapper {
		position: relative;
		width: 100%;
	}

	.commentTextarea {
		width: 100%;
		min-height: 60px;
		padding: 8px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 14px;
		line-height: 1.5;
		resize: vertical;
		font-family: inherit;

		&:focus {
			outline: none;
			border-color: hsl(var(--primary));
			box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1);
		}
	}

	/* Comment actions row */
	.commentActions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.commentToolBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		transition: all 0.15s;

		&:hover {
			background: hsl(var(--muted));
			color: hsl(var(--foreground));
		}
	}

	/* Comment level tag */
	.commentLevelTag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		background: hsl(var(--muted) / 0.5);
		font-size: 12px;
		font-weight: 500;
	}

	.clearLevelBtn {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;

		&:hover {
			background: hsl(var(--muted));
			color: hsl(var(--foreground));
		}
	}

	/* Comment level attachment */
	.commentLevelAttachment {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		background: hsl(var(--muted) / 0.3);
		font-size: 12px;
		font-weight: 500;
		text-decoration: none;
		color: inherit;
		margin-bottom: 4px;
		transition: background 0.15s;

		&:hover {
			background: hsl(var(--muted) / 0.6);
		}

		.attachedMeta {
			font-size: 11px;
			color: hsl(var(--muted-foreground));
		}
	}
</style>
