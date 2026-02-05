<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { user } from '$lib/client';
	import Loading from '$lib/components/animation/loading.svelte';
	import { toast } from 'svelte-sonner';
	import { isActive } from '$lib/client/isSupporterActive';
	import { navigating, page } from '$app/stores';
	import { onMount } from 'svelte';
	import { locale } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import { Lightbulb } from 'lucide-svelte';

	const defaultValue: any = {
		levelid: NaN,
		userid: $user.data.uid,
		progress: NaN,
		refreshRate: '',
		videoLink: '',
		raw: '',
		mobile: null,
		suggestedRating: NaN,
		comment: ''
	};

	let submission: any = {
		levelid: NaN,
		userid: $user.data.uid,
		progress: NaN,
		refreshRate: '',
		videoLink: '',
		raw: '',
		mobile: null,
		suggestedRating: NaN,
		comment: ''
	};

	let submitLog: string[] = [];
	let apiLevel: any = null;
	let level: any = null;
	let sendStatus = 0;
	let open = false;
	let logsOpen = false;
	let step = 0;
	let nextDisabled = false;
	let errorMessage = '';
	let errorResponse = '';
	let submitId = 0;
	let time = {
		m: null,
		s: null,
		ms: null
	};

	function getMs() {
		return parseInt(time.m! || 0) * 60000 + parseInt(time.s! || 0) * 1000 + parseInt(time.ms! || 0);
	}

	function validTime() {
		if (time.m == null || time.s == null || time.ms == null) {
			return false;
		}

		if (time.m < 0 || time.s < 0 || time.ms < 0) {
			return false;
		}

		if (time.s >= 60 || time.ms >= 1000) {
			return false;
		}

		return true;
	}

	async function submit() {
		if (apiLevel.length == 5) {
			submission.progress = getMs();
		}

		if (submission.mobile != null) {
			submission.mobile = submission.mobile.value;
		}

		submitId = new Date().getTime();

		fetch(`${import.meta.env.VITE_API_URL}/submission?id=${submitId}`, {
			method: 'POST',
			body: JSON.stringify(submission),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		}).then(async (res) => {
			if (res.ok) {
				sendStatus = 1;
			} else {
				sendStatus = 2;
			}

			const responseText = await res.text();
			errorResponse = responseText;
			try {
				const resJson = JSON.parse(responseText);
				submitLog = resJson.logs;

				if ($locale == 'vi') {
					errorMessage = resJson.vi;
				} else {
					errorMessage = resJson.en;
				}
			} catch {
				errorMessage = responseText;
			}

			console.log(JSON.parse(responseText));
		});
	}

	async function fetchLevel() {
		try {
			level = await (
				await fetch(`${import.meta.env.VITE_API_URL}/levels/${submission.levelid}`)
			).json();
		} catch {}

		apiLevel = await (
			await fetch(`${import.meta.env.VITE_API_URL}/levels/${submission.levelid}?fromGD=1`)
		).json();
	}

	function next() {
		if (step == 1) {
			apiLevel = null;
			nextDisabled = true;

			fetchLevel()
				.then(() => {
					nextDisabled = false;
				})
				.catch(() => {
					toast.error('Invalid level ID');
					nextDisabled = false;
					step--;
				});
		}

		if (step == 3) {
			if (apiLevel.length == 5 && !validTime()) {
				toast.error('Invalid time');
				return;
			}

			if (apiLevel.length != 5) {
				if (
					!submission.progress ||
					!submission.refreshRate ||
					!submission.videoLink ||
					!submission.mobile
				) {
					toast.error('Please fill in all required fields');
					return;
				}
			} else {
				if (
					!validTime() ||
					!submission.refreshRate ||
					!submission.videoLink ||
					!submission.mobile
				) {
					toast.error('Please fill in all required fields');
					return;
				}
			}

			if (level) {
				if ((!level.flTop || level.rating) && !submission.raw) {
					toast.error('Please fill in all required fields');
					return;
				}
			} else if (!submission.raw) {
				toast.error('Please fill in all required fields');
				return;
			} else if (submission.raw == submission.videoLink) {
				toast.error('Raw is not completion video.');
				return;
			}

			if (level && submission.progress < level.minProgress) {
				toast.error('Not enough progress');
				return;
			}
		}

		step++;
	}

	function onRouteChange(to: any) {
		if (!$user.loggedIn || !isActive($user.data.supporterUntil)) {
			defaultValue.levelid = NaN;
			return;
		}

		if (to?.route.id == '/level/[id]') {
			defaultValue.levelid = parseInt(to.params!.id);
		} else {
			defaultValue.levelid = NaN;
		}
	}

	$: if ($navigating) {
		onRouteChange($navigating.to);
	}

	onMount(() => {
		onRouteChange($page);
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'outline' })}
		on:click={() => {
			for (const i in submission) {
				// @ts-ignore
				submission[i] = defaultValue[i];
				step = 0;
				apiLevel = null;
				level = null;
				time = {
					m: null,
					s: null,
					ms: null
				};
			}
		}}>{$_('submit.button')}</Dialog.Trigger
	>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>
				{#if step == 0}
					{$_('submit.attention.title')}
				{:else if step == 1 || step == 2}
					{$_('submit.level.title')}
				{:else if step == 3}
					{$_('submit.required.title')}
				{:else if step == 4}
					{$_('submit.optional.title')}
				{/if}
			</Dialog.Title>
		</Dialog.Header>
		{#if step == 0}
			<Alert.Root>
				<Alert.Description>
					{#if $locale == 'vi'}
						- Đọc <button on:click={() => (open = false)}><a href="/rules"><u>luật</u></a></button>
						trước khi nộp.<br />
						- Điểm đề xuất là điểm của DLVN, không phải sao hay thứ hạng của level.
						<br />
						- Video thô là video quay từ lúc bắt đầu đến kết thúc quá trình quay chưa bị chỉnh sửa.
						<br />
						- Sử dụng
						<a href="https://github.com/NamPE286/DemonListVN-geode-mod/releases">
							<u>Geometry Dash VN's geode mod</u>
						</a> trong khi chơi level để có cơ hội chấp nhận cao hơn.
					{:else}
						- Read the <button on:click={() => (open = false)}
							><a href="/rules"><u>rules</u></a></button
						>
						before submitting.<br />
						- Suggested rating is Geometry Dash VN level's rating, not level's stars or placement.
						<br />
						- Raw is recording from the beginning to the end of the recording session without editing.
						<br />
						- Use
						<a href="https://github.com/NamPE286/DemonListVN-geode-mod/releases">
							<u>Geometry Dash VN's geode mod</u>
						</a> while beating level to have higher chance of acceptance.
					{/if}
				</Alert.Description>
			</Alert.Root>
		{/if}
		{#if step > 0}
			<div class="grid gap-4 py-4">
				{#if step == 1}
					<Alert.Root>
						<Alert.Description class="flex items-center gap-[10px]">
							<Lightbulb size={24} />
							<span>
								{#if $locale == 'vi'}
									Mẹo: Vào trang level và bấm Nộp để tự động điền ID. (Dành cho <a href="/supporter"
										>Supporter</a
									>)
								{:else}
									Tip: Go to the level page and click Submit to auto-fill the ID. (For <a
										href="/supporter">Supporter</a
									>)
								{/if}
							</span>
						</Alert.Description>
					</Alert.Root>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">Level ID</Label>
						<Input
							id="name"
							type="number"
							inputmode="numeric"
							bind:value={submission.levelid}
							class="col-span-3"
						/>
					</div>
				{/if}
				{#if step == 2}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">Level ID</Label>
						<Input
							id="name"
							type="number"
							inputmode="numeric"
							bind:value={submission.levelid}
							class="col-span-3"
							disabled={true}
						/>
					</div>
					{#if !apiLevel}
						<Loading inverted={true} />
					{:else}
						<div class="text-center">
							{#if $locale == 'vi'}
								Bạn chuẩn bị nộp cho level <a href={`/level/${apiLevel.id}`}
									><b><u>{apiLevel.name}</u></b></a
								>
								by {apiLevel.author}
							{:else}
								You are going to submit <a href={`/level/${apiLevel.id}`}
									><b><u>{apiLevel.name}</u></b></a
								>
								by {apiLevel.author}
							{/if}
						</div>
					{/if}
				{/if}
				{#if step == 3}
					{#if apiLevel.length != 5}
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">{$_('submit.required.progress')}</Label>
							<Input
								id="name"
								type="number"
								inputmode="numeric"
								bind:value={submission.progress}
								placeholder={level && level.rating
									? `${$_('submit.required.minimum')} ${level.minProgress}%`
									: `${$_('submit.required.minimum')} 100%`}
								class="col-span-3"
							/>
						</div>
					{:else}
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">Time</Label>
							<div class="flex gap-[10px]">
								<Input
									id="name"
									type="number"
									inputmode="numeric"
									bind:value={time.m}
									class="w-[75px]"
									placeholder="m"
								/>
								<Input
									id="name"
									type="number"
									inputmode="numeric"
									bind:value={time.s}
									class="w-[75px]"
									placeholder="s"
								/>
								<Input
									id="name"
									type="number"
									inputmode="numeric"
									bind:value={time.ms}
									class="w-[75px]"
									placeholder="ms"
								/>
							</div>
						</div>
					{/if}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">FPS</Label>
						<Input
							id="name"
							type="number"
							inputmode="numeric"
							bind:value={submission.refreshRate}
							placeholder="CBF/∞ FPS = 0 FPS"
							class="col-span-3"
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">{$_('submit.required.video')}</Label>
						<Input id="name" bind:value={submission.videoLink} class="col-span-3" />
					</div>
					{#if !level || !level.flTop || level.rating}
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">{$_('submit.required.raw')}</Label>
							<Input id="name" bind:value={submission.raw} class="col-span-3" />
						</div>
					{/if}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">{$_('submit.required.platform')}</Label>
						<Select.Root bind:selected={submission.mobile}>
							<Select.Trigger class="col-span-3">
								<Select.Value placeholder="Select a platform" />
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Label>Platform</Select.Label>
									<Select.Item value={false} label="PC">PC</Select.Item>
									<Select.Item value={true} label="Mobile">Mobile</Select.Item>
								</Select.Group>
							</Select.Content>
							<Select.Input name="platform" value={true} />
						</Select.Root>
					</div>
				{/if}
				{#if step == 4}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">{$_('submit.optional.suggestion')}</Label>
						<Input
							id="name"
							type="number"
							inputmode="numeric"
							disabled={apiLevel.length != 5 && submission.progress != 100}
							bind:value={submission.suggestedRating}
							placeholder={!(apiLevel.length != 5 && submission.progress != 100)
								? 'optional (không ghi cũng được)'
								: 'progress must be 100%'}
							class="col-span-3"
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="name" class="text-right">{$_('submit.optional.comment')}</Label>
						<Input
							id="name"
							bind:value={submission.comment}
							placeholder="optional (không ghi cũng được)"
							class="col-span-3"
						/>
					</div>
				{/if}
			</div>
		{/if}
		<Dialog.Footer>
			<AlertDialog.Root>
				<AlertDialog.Trigger asChild let:builder>
					<div class="flex gap-[10px]">
						{#if step > 0}
							<Button
								class="w-full"
								on:click={() => {
									step--;
								}}
								variant="outline">{$_('submit.back')}</Button
							>
						{/if}
						{#if step == 4}
							<Button
								class="w-full"
								type="submit"
								builders={[builder]}
								on:click={() => {
									sendStatus = 0;
									submit();
								}}>{$_('submit.button')}</Button
							>
						{:else}
							<Button class="w-full" on:click={next} bind:disabled={nextDisabled}
								>{$_('submit.next')}</Button
							>
						{/if}
					</div>
				</AlertDialog.Trigger>
				{#if sendStatus == 0}
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>{$_('submit.send.loading.title')}</AlertDialog.Title>
							<AlertDialog.Description
								>{$_('submit.send.loading.description')}</AlertDialog.Description
							>
						</AlertDialog.Header>
					</AlertDialog.Content>
				{:else if sendStatus == 1}
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>{$_('submit.send.success.title')}</AlertDialog.Title>
							<AlertDialog.Description>
								{#if isActive($user.data.supporterUntil)}
									{#if $locale == 'vi'}
										Bản nộp của bạn đã được gửi đi và <span class="text-yellow-500">ưu tiên!</span> Nó
										sẽ được duyệt trong thời gian ngắn nhất.
									{:else}
										Your submission has been sent and <span class="text-yellow-500"
											>prioritized!</span
										> It will be reviewed shortly.
									{/if}
								{:else}
									{$_('submit.send.success.description')}
								{/if}
							</AlertDialog.Description>
						</AlertDialog.Header>
						{#if !isActive($user.data.supporterUntil)}
							<Alert.Root class="border-yellow-400">
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
						<AlertDialog.Footer class="gap-[5px] lg:gap-0">
							{#if submitLog && submitLog.length > 0}
								<Button on:click={() => (logsOpen = true)} variant="outline">
									{$_('submit.send.detail')}<br />
								</Button>
							{/if}
							<AlertDialog.Cancel on:click={() => (open = false)}>Close</AlertDialog.Cancel>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				{:else if sendStatus == 2}
					<AlertDialog.Content class="max-h-[80vh] max-w-[600px] overflow-y-auto">
						<AlertDialog.Header>
							<AlertDialog.Title>{$_('submit.send.failed.title')}</AlertDialog.Title>
							<AlertDialog.Description>
								{$_('submit.send.failed.description')}<br />
								ⓘ {errorMessage}
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer class="gap-[5px] lg:gap-0">
							{#if submitLog && submitLog.length > 0}
								<Button on:click={() => (logsOpen = true)} variant="outline">
									{$_('submit.send.detail')}<br />
								</Button>
							{/if}
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
										submitId: submitId,
										response: errorResponse,
										logs: submitLog
									};
									navigator.clipboard.writeText(
										'```json\n' + JSON.stringify(submissionInfo, null, 2) + '```'
									);
									toast.success($_('toast.clipboard'));
								}}
							>
								{$_('submit.copy') || 'Copy Error'}
							</Button>
							<AlertDialog.Cancel on:click={() => (open = false)}
								>{$_('submit.close')}</AlertDialog.Cancel
							>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				{/if}
			</AlertDialog.Root>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={logsOpen}>
	<Dialog.Content class="flex max-h-[80vh] max-w-[800px] flex-col overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Submission Logs</Dialog.Title>
			<Dialog.Description>
				Detailed submission process logs ({submitLog.length} entries)
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex-1 overflow-y-auto rounded-md border bg-muted/50 p-4">
			<div class="space-y-2 font-mono text-xs">
				{#each submitLog as log, index}
					<div
						class="rounded border-l-2 bg-background p-2 {log.includes('Error') ||
						log.includes('error')
							? 'border-red-500'
							: log.includes('success') || log.includes('approved')
								? 'border-green-500'
								: 'border-blue-500'}"
					>
						<div class="flex gap-2">
							<span class="select-none text-muted-foreground">{index + 1}.</span>
							<div class="flex-1 whitespace-pre-wrap break-words">
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
										<div>
											<span class="text-foreground">{parsed.prefix}</span>
											<pre class="mt-1 overflow-x-auto text-green-400">{JSON.stringify(
													parsed.json,
													null,
													2
												)}</pre>
										</div>
									{:else}
										<span class="text-foreground">{log}</span>
									{/if}
								{:else}
									<span class="text-foreground">{log}</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	a {
		text-decoration: underline;
	}
</style>
