<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	export let open = false;
	export let target: { type: 'post' | 'comment'; id: number } | null = null;

	let reportReason = 'inappropriate';
	let reportDescription = '';
	let submittingReport = false;

	async function getHeaders() {
		const token = await $user.token();
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (token) headers['Authorization'] = `Bearer ${token}`;
		return headers;
	}

	async function submitReport() {
		if (!target) return;
		submittingReport = true;
		const headers = await getHeaders();

		try {
			const endpoint =
				target.type === 'post'
					? `${import.meta.env.VITE_API_URL}/community/posts/${target.id}/report`
					: `${import.meta.env.VITE_API_URL}/community/comments/${target.id}/report`;

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
			open = false;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			submittingReport = false;
		}
	}

	$: if (open) {
		reportReason = 'inappropriate';
		reportDescription = '';
	}
</script>

<Dialog.Root bind:open>
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
						<Select.Item value="inappropriate"
							>{$_('community.report.reasons.inappropriate')}</Select.Item
						>
						<Select.Item value="spam">{$_('community.report.reasons.spam')}</Select.Item>
						<Select.Item value="harassment"
							>{$_('community.report.reasons.harassment')}</Select.Item
						>
						<Select.Item value="misinformation"
							>{$_('community.report.reasons.misinformation')}</Select.Item
						>
						<Select.Item value="other">{$_('community.report.reasons.other')}</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="reportField">
				<label for="report-desc"
					>{$_('community.report.details')} ({$_('community.create.optional')})</label
				>
				<Textarea
					id="report-desc"
					bind:value={reportDescription}
					placeholder={$_('community.report.details_placeholder')}
					rows={3}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" on:click={() => (open = false)}>
				{$_('general.close')}
			</Button>
			<Button variant="destructive" on:click={submitReport} disabled={submittingReport}>
				{submittingReport ? $_('community.report.submitting') : $_('community.report.submit')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
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

		label,
		.reportLabel {
			font-size: 13px;
			font-weight: 500;
		}
	}
</style>
