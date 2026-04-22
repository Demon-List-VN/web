<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { locale } from 'svelte-i18n';
	import { Clock3, ExternalLink, MessageSquareText, CheckCircle2, XCircle } from 'lucide-svelte';

	export let list: any = null;
	export let submissions: any[] = [];
	export let canReviewSubmissions = false;
	export let loading = false;
	export let errorMessage = '';
	export let savingSubmissionId: number | null = null;
	export let reviewSubmission: (submission: any, payload: {
		accept: boolean;
		rating?: number | null;
		minProgress?: number | null;
		position?: number | null;
	}) => void | Promise<void> = async () => {};
	export let rejectSubmission: (submission: any) => void | Promise<void> = async () => {};

	let dialogOpen = false;
	let activeSubmission: any = null;
	let ratingValue = '';
	let minProgressValue = '';
	let positionValue = '';
	let submittingReview = false;

	$: isTopList = list?.mode === 'top';
	$: isPlatformer = Boolean(list?.isPlatformer);
	$: queueCount = submissions.length;

	function formatDate(value: string) {
		return new Date(value).toLocaleString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getLevelName(submission: any) {
		return submission?.level?.name?.trim()?.length ? submission.level.name : `Level #${submission.levelId}`;
	}

	function getLevelCreator(submission: any) {
		return submission?.level?.creator?.trim()?.length ? submission.level.creator : 'Unknown';
	}

	function getSubmitterName(submission: any) {
		return submission?.submitterData?.name?.trim()?.length ? submission.submitterData.name : submission.addedBy || 'Unknown';
	}

	function getSubmitterHref(submission: any) {
		return submission?.submitterData?.uid || submission.addedBy ? `/player/${submission.submitterData?.uid || submission.addedBy}` : null;
	}

	function openReviewDialog(submission: any) {
		activeSubmission = submission;
		ratingValue = String(submission.rating ?? 5);
		minProgressValue = submission.minProgress == null ? '' : String(submission.minProgress);
		positionValue = String((list?.levelCount ?? 0) + 1);
		dialogOpen = true;
	}

	async function acceptActiveSubmission() {
		if (!activeSubmission) return;

		const payload: {
			accept: boolean;
			rating?: number | null;
			minProgress?: number | null;
			position?: number | null;
		} = {
			accept: true
		};

		if (isTopList) {
			const position = Number.parseInt(positionValue, 10);
			if (!Number.isInteger(position) || position < 1) {
				return;
			}

			payload.position = position;
			payload.minProgress = minProgressValue.trim().length ? Number.parseInt(minProgressValue, 10) : null;
		} else {
			const rating = Number.parseFloat(ratingValue);
			if (!Number.isFinite(rating) || rating < 0) {
				return;
			}

			payload.rating = rating;
			payload.minProgress = minProgressValue.trim().length ? Number.parseInt(minProgressValue, 10) : null;
		}

		submittingReview = true;
		try {
			await reviewSubmission(activeSubmission, payload);
			dialogOpen = false;
			activeSubmission = null;
		} finally {
			submittingReview = false;
		}
	}

	async function rejectActiveSubmission(submission: any = activeSubmission) {
		if (!submission) return;

		if (!confirm($locale == 'vi' ? 'Từ chối level này?' : 'Reject this submitted level?')) {
			return;
		}

		submittingReview = true;
		try {
			await rejectSubmission(submission);
			dialogOpen = false;
			activeSubmission = null;
		} finally {
			submittingReview = false;
		}
	}
</script>

<div class="tabContent">
	{#if canReviewSubmissions}
		<div class="toolCard queueCard">
			<div class="queueHeader">
				<div>
					<h2 class="toolHeading">{ $locale == 'vi' ? 'Hàng đợi duyệt level' : 'Level review queue' }</h2>
					<p class="hint">
						{ $locale == 'vi'
							? 'Các bản nộp mới nhất ở dưới cùng, bản cũ nhất sẽ được duyệt trước.'
							: 'Oldest submissions appear first.' }
					</p>
				</div>
				<Badge variant="secondary">{queueCount}</Badge>
			</div>

			{#if loading}
				<p class="hint">{ $locale == 'vi' ? 'Đang tải hàng đợi...' : 'Loading queue...' }</p>
			{:else if errorMessage}
				<p class="hint">{errorMessage}</p>
			{:else if submissions.length === 0}
				<p class="hint">{ $locale == 'vi' ? 'Chưa có level nào chờ duyệt.' : 'No submitted levels are waiting for review.' }</p>
			{:else}
				<div class="queueList">
					{#each submissions as submission}
						<article class="queueItem">
							<div class="queueItemTop">
								<div class="queueItemHeading">
									<Badge variant="secondary">
										{ $locale == 'vi' ? 'Chờ duyệt' : 'Pending' }
									</Badge>
									<h3>{getLevelName(submission)}</h3>
									<Badge variant="outline">#{submission.levelId}</Badge>
								</div>
								<p class="queueItemMeta">
									{ $locale == 'vi' ? 'bởi' : 'by' } {getLevelCreator(submission)}
								</p>
								<p class="queueItemMeta">
									<Clock3 class="inline-icon" />
									{formatDate(submission.created_at)}
								</p>
							</div>

							<div class="queueItemBody">
								<div class="metaRow">
									<span class="metaLabel">{ $locale == 'vi' ? 'Người gửi' : 'Submitted by' }</span>
									{#if getSubmitterHref(submission)}
										<a class="metaValue linkLike" href={getSubmitterHref(submission)}>
											{getSubmitterName(submission)}
											<ExternalLink size={12} class="inline-icon" />
										</a>
									{:else}
										<span class="metaValue">{getSubmitterName(submission)}</span>
									{/if}
								</div>

								{#if submission.submissionComment}
									<div class="commentBlock">
										<MessageSquareText size={14} class="inline-icon" />
										<p>{submission.submissionComment}</p>
									</div>
								{/if}

								{#if submission.videoID}
									<div class="videoRow">
										<span class="metaLabel">Video</span>
										<a href={`https://youtu.be/${submission.videoID}`} target="_blank" rel="noreferrer" class="metaValue linkLike">
											{submission.videoID}
											<ExternalLink size={12} class="inline-icon" />
										</a>
									</div>
								{/if}
							</div>

							<div class="queueItemActions">
								<Button variant="outline" on:click={() => rejectActiveSubmission(submission)} disabled={savingSubmissionId === submission.id || submittingReview}>
									<XCircle class="mr-2 h-4 w-4" />
									{ $locale == 'vi' ? 'Từ chối' : 'Reject' }
								</Button>
								<Button on:click={() => openReviewDialog(submission)} disabled={savingSubmissionId === submission.id || submittingReview}>
									<CheckCircle2 class="mr-2 h-4 w-4" />
									{ $locale == 'vi' ? 'Duyệt' : 'Review' }
								</Button>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-[620px]">
		<Dialog.Header>
			<Dialog.Title>{ $locale == 'vi' ? 'Duyệt level đã nộp' : 'Review submitted level' }</Dialog.Title>
			<Dialog.Description>
				{ $locale == 'vi'
					? 'Chọn rating/top và min progress trước khi đưa level vào danh sách.'
					: 'Set the final values before adding the level to the list.' }
			</Dialog.Description>
		</Dialog.Header>

		{#if activeSubmission}
			<div class="dialogBody">
				<div class="summaryCard">
					<div class="summaryHeadingRow">
						<Badge variant="secondary">#{activeSubmission.levelId}</Badge>
						<h3>{getLevelName(activeSubmission)}</h3>
					</div>
					<p class="hint">{getLevelCreator(activeSubmission)}</p>
					{#if activeSubmission.submissionComment}
						<p class="submissionComment">{activeSubmission.submissionComment}</p>
					{/if}
				</div>

				{#if isTopList}
					<div class="field">
						<Label for="submission-top">{ $locale == 'vi' ? 'Top' : 'Top' }</Label>
						<Input id="submission-top" bind:value={positionValue} type="number" inputmode="numeric" min="1" />
					</div>
				{:else}
					<div class="field">
						<Label for="submission-rating">{ $locale == 'vi' ? 'Rating' : 'Rating' }</Label>
						<Input id="submission-rating" bind:value={ratingValue} type="number" inputmode="decimal" min="0" step="0.1" />
					</div>
				{/if}

				<div class="field">
					<Label for="submission-min-progress">
						{ $locale == 'vi' ? (isPlatformer ? 'Base time' : 'Min progress') : (isPlatformer ? 'Base time' : 'Min progress') }
					</Label>
					<Input
						id="submission-min-progress"
						bind:value={minProgressValue}
						type="number"
						inputmode="numeric"
						min="0"
					/>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="gap-2">
			<Button variant="outline" on:click={() => (dialogOpen = false)} disabled={submittingReview}>
				{ $locale == 'vi' ? 'Đóng' : 'Close' }
			</Button>
			<Button variant="destructive" on:click={() => rejectActiveSubmission()} disabled={submittingReview}>
				<XCircle class="mr-2 h-4 w-4" />
				{ $locale == 'vi' ? 'Từ chối' : 'Reject' }
			</Button>
			<Button on:click={acceptActiveSubmission} disabled={submittingReview}>
				<CheckCircle2 class="mr-2 h-4 w-4" />
				{ $locale == 'vi' ? 'Duyệt' : 'Accept' }
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.queueCard,
	.summaryCard {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.queueHeader,
	.queueItemTop,
	.summaryHeadingRow {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.queueItemHeading {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.queueList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.queueItem {
		padding: 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		background: hsl(var(--muted) / 0.08);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.queueItemBody {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.queueItemMeta,
	.metaLabel {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.metaRow,
	.videoRow,
	.commentBlock {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		flex-wrap: wrap;
	}

	.metaValue,
	.linkLike {
		font-size: 13px;
		color: hsl(var(--foreground));
	}

	.linkLike {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		text-decoration: underline;
	}

	.queueItemActions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.dialogBody {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.summaryCard {
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.06);
	}

	.submissionComment {
		font-size: 13px;
		line-height: 1.5;
		color: hsl(var(--foreground));
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
