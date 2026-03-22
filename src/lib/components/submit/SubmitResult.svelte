<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import Loading from '$lib/components/animation/loading.svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { locale, _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	export let sendStatus: 0 | 1 | 2;
	export let errorMessage: string;
	export let errorResponse: string;
	export let submitLog: string[];
	export let submitId: number;
	export let submission: any;
	export let apiLevel: any;
	export let time: any;
	export let onReset: () => void;

	let logsExpanded = false;
</script>

<div class="result-container" in:fly={{ y: 20, duration: 300 }}>
	{#if sendStatus === 0}
		<div class="result-loading">
			<Loading inverted={true} />
			<h3>{$_('submit.send.loading.title')}</h3>
			<p class="text-muted">{$_('submit.send.loading.description')}</p>
		</div>
	{:else if sendStatus === 1}
		<div class="result-success">
			<div class="result-icon success">
				<CheckCircle2 size={48} />
			</div>
			<h3>{$_('submit.send.success.title')}</h3>
			{#if isActive($user.data.supporterUntil)}
				<p class="text-muted">
					{#if $locale == 'vi'}
						Bản nộp của bạn đã được gửi đi và <span class="text-yellow-500">ưu tiên!</span> Nó
						sẽ được duyệt trong thời gian ngắn nhất.
					{:else}
						Your submission has been sent and <span class="text-yellow-500">prioritized!</span>
						It will be reviewed shortly.
					{/if}
				</p>
			{:else}
				<p class="text-muted">{$_('submit.send.success.description')}</p>
			{/if}

			{#if !isActive($user.data.supporterUntil)}
				<Alert.Root class="supporter-alert">
					<Alert.Description>
						{#if $locale == 'vi'}
							Bản nộp của <a class="underline" href="/supporter">Supporter</a> được ưu tiên duyệt.
							Những bản nộp này được coi như nộp sớm hơn 30 ngày (bỏ qua khoảng hơn 1 nghìn bản
							nộp khác).
						{:else}
							<a class="underline" href="/supporter">Supporters'</a> submissions are prioritized
							in the review queue. Their records are treated as if they were submitted 30 days
							earlier (skip ahead by about 1K+ submissions).
						{/if}
					</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="result-actions">
				<Button variant="outline" on:click={onReset}>
					{$locale == 'vi' ? 'Nộp thêm' : 'Submit Another'}
				</Button>
				<Button href={`/mySubmission/${$user.data.uid}`}>
					{$locale == 'vi' ? 'Xem bản nộp' : 'View My Submissions'}
				</Button>
			</div>
		</div>
	{:else if sendStatus === 2}
		<div class="result-error">
			<div class="result-icon error">
				<XCircle size={48} />
			</div>
			<h3>{$_('submit.send.failed.title')}</h3>
			<p class="text-muted">
				{$_('submit.send.failed.description')}
			</p>
			{#if errorMessage}
				<div class="error-detail">
					{errorMessage}
				</div>
			{/if}

			<div class="result-actions">
				<Button
					variant="outline"
					on:click={() => {
						const submissionInfo = {
							request: {
								levelId: submission.levelid,
								levelName: apiLevel?.name || 'N/A',
								levelAuthor: apiLevel?.author || 'N/A',
								progress:
									apiLevel?.length == 5
										? {
												minutes: time.m || 0,
												seconds: time.s || 0,
												milliseconds: time.ms || 0
											}
										: { percentage: submission.progress },
								fps: submission.refreshRate,
								videoLink: submission.videoLink,
								rawLink: submission.raw,
								platform: submission.mobile?.value ? 'Mobile' : 'PC',
								suggestedRating: submission.suggestedRating || null,
								comment: submission.comment || null
							},
							submitId,
							response: errorResponse,
							logs: submitLog
						};
						navigator.clipboard.writeText(
							'```json\n' + JSON.stringify(submissionInfo, null, 2) + '```'
						);
						toast.success($_('toast.clipboard'));
					}}
				>
					<Copy size={14} class="mr-1" />
					{$_('submit.copy') || 'Copy Error'}
				</Button>
				<Button on:click={onReset}>
					{$locale == 'vi' ? 'Thử lại' : 'Try Again'}
				</Button>
			</div>
		</div>
	{/if}

	{#if sendStatus !== 0 && submitLog && submitLog.length > 0}
		<div class="logs-section">
			<button class="logs-toggle" on:click={() => (logsExpanded = !logsExpanded)}>
				<span>{$locale == 'vi' ? 'Nhật ký nộp' : 'Submission Logs'} ({submitLog.length})</span>
				{#if logsExpanded}
					<ChevronUp size={16} />
				{:else}
					<ChevronDown size={16} />
				{/if}
			</button>

			{#if logsExpanded}
				<div class="logs-content" in:fly={{ y: -10, duration: 200 }}>
					{#each submitLog as log, index}
						<div
							class="log-entry"
							class:log-error={log.includes('Error') || log.includes('error')}
							class:log-success={log.includes('success') || log.includes('approved')}
						>
							<span class="log-index">{index + 1}.</span>
							<div class="log-text">
								{#if log.includes('{') || log.includes('[')}
									{@const parsed = (() => {
										try {
											const match = log.match(/(\{.*\}|\[.*\])/s);
											if (match) {
												return {
													prefix: log.substring(0, match.index),
													json: JSON.parse(match[1]),
													hasJson: true
												};
											}
										} catch {}
										return { prefix: log, hasJson: false };
									})()}

									{#if parsed.hasJson}
										<span>{parsed.prefix}</span>
										<pre class="log-json">{JSON.stringify(parsed.json, null, 2)}</pre>
									{:else}
										<span>{log}</span>
									{/if}
								{:else}
									<span>{log}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.result-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.result-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 40px 0;

		h3 {
			font-size: 16px;
			font-weight: 600;
		}
	}

	.result-success,
	.result-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 24px 0;
		text-align: center;

		h3 {
			font-size: 18px;
			font-weight: 600;
		}
	}

	.result-icon {
		margin-bottom: 4px;

		&.success {
			color: hsl(142 76% 36%);
		}

		&.error {
			color: hsl(var(--destructive, 0 84% 60%));
		}
	}

	.text-muted {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		max-width: 400px;
		line-height: 1.5;
	}

	.error-detail {
		font-size: 13px;
		padding: 10px 16px;
		border-radius: 8px;
		background: hsl(var(--destructive, 0 84% 60%) / 0.08);
		color: hsl(var(--destructive, 0 84% 60%));
		max-width: 100%;
		word-break: break-word;
	}

	.supporter-alert {
		border-color: hsl(48 96% 53%) !important;
		max-width: 400px;
	}

	.result-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.logs-section {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		overflow: hidden;
	}

	.logs-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: hsl(var(--muted) / 0.2);
		border: none;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--foreground));
		transition: background 0.15s ease;

		&:hover {
			background: hsl(var(--muted) / 0.4);
		}
	}

	.logs-content {
		padding: 8px;
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.log-entry {
		display: flex;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 6px;
		border-left: 2px solid hsl(var(--primary) / 0.4);
		background: hsl(var(--muted) / 0.1);
		font-size: 12px;
		font-family: monospace;

		&.log-error {
			border-left-color: hsl(var(--destructive, 0 84% 60%));
		}

		&.log-success {
			border-left-color: hsl(142 76% 36%);
		}
	}

	.log-index {
		color: hsl(var(--muted-foreground));
		user-select: none;
		min-width: 20px;
	}

	.log-text {
		flex: 1;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.log-json {
		margin-top: 4px;
		color: hsl(142 76% 56%);
		overflow-x: auto;
	}
</style>
