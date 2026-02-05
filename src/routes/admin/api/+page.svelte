<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	// Death Count simulator
	let deathCountData = {
		levelID: '',
		completed: false
	};
	let deathCountArray: number[] = Array(100).fill(0);
	let deathCountLoading = false;
	
	// New attempt inputs
	let attemptPercent: number | '' = '';
	let attemptCount: number | '' = '';
	
	interface Attempt {
		percent: number;
		count: number;
		timestamp: Date;
	}
	let attempts: Attempt[] = [];

	function addAttempt() {
		if (attemptPercent === '' || attemptCount === '') {
			toast.error('Please enter both percent and count');
			return;
		}
		
		if (attemptPercent < 0 || attemptPercent > 99) {
			toast.error('Percent must be between 0 and 99');
			return;
		}
		
		if (attemptCount < 0) {
			toast.error('Count must be a positive number');
			return;
		}

		// Add count to the array at the percent index
		deathCountArray[attemptPercent] += Number(attemptCount);
		
		// Log the attempt
		attempts = [...attempts, {
			percent: Number(attemptPercent),
			count: Number(attemptCount),
			timestamp: new Date()
		}];
		
		// Clear inputs
		attemptPercent = '';
		attemptCount = '';
		
		toast.success(`Added ${attemptCount} deaths at ${attemptPercent}%`);
	}

	function removeAttempt(index: number) {
		const attempt = attempts[index];
		// Subtract the count from the array
		deathCountArray[attempt.percent] -= attempt.count;
		// Remove from attempts log
		attempts = attempts.filter((_, i) => i !== index);
		toast.success('Attempt removed');
	}

	// Event Submit Level simulator
	let eventSubmitData = {
		levelID: '',
		progress: '',
		password: ''
	};
	let eventSubmitLoading = false;

	// Response displays
	let deathCountResponse = '';
	let eventSubmitResponse = '';

	async function simulateDeathCount() {
		try {
			if (!deathCountData.levelID) {
				throw new Error('Level ID is required');
			}

			deathCountLoading = true;
			deathCountResponse = '';

			// Convert array to pipe-separated string
			const countString = deathCountArray.join('|');

			const url = `${import.meta.env.VITE_API_URL}/deathCount/${deathCountData.levelID}/${countString}${deathCountData.completed ? '?completed=true' : ''}`;

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
			}

			const responseData = await response.text();
			deathCountResponse = JSON.stringify(
				{
					status: response.status,
					statusText: response.statusText,
					data: responseData || '(empty response)'
				},
				null,
				2
			);

			toast.success('Death count updated successfully!');
		} catch (error: any) {
			deathCountResponse = JSON.stringify(
				{
					error: error.message || 'Failed to update death count'
				},
				null,
				2
			);
			toast.error(error.message || 'Failed to update death count');
		} finally {
			deathCountLoading = false;
		}
	}

	async function simulateEventSubmit() {
		try {
			if (!eventSubmitData.levelID || !eventSubmitData.progress || !eventSubmitData.password) {
				throw new Error('Level ID, Progress, and Password are required');
			}

			eventSubmitLoading = true;
			eventSubmitResponse = '';

			const url = `${import.meta.env.VITE_API_URL}/events/submitLevel/${eventSubmitData.levelID}?progress=${eventSubmitData.progress}&password=${encodeURIComponent(eventSubmitData.password)}`;

			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
			}

			const responseData = await response.text();
			eventSubmitResponse = JSON.stringify(
				{
					status: response.status,
					statusText: response.statusText,
					data: responseData || '(empty response)'
				},
				null,
				2
			);

			toast.success('Event level submitted successfully!');
		} catch (error: any) {
			eventSubmitResponse = JSON.stringify(
				{
					error: error.message || 'Failed to submit event level'
				},
				null,
				2
			);
			toast.error(error.message || 'Failed to submit event level');
		} finally {
			eventSubmitLoading = false;
		}
	}

// Build and copy cURL commands
async function buildCurlCommand(method: string, url: string, headers: Record<string, string | undefined> = {}, body?: string) {
	const parts: string[] = ['curl', '-X', method.toUpperCase(), `"${url}"`];

	for (const key in headers) {
		const val = headers[key];
		if (!val) continue;
		// escape double quotes in header values
		const safeVal = String(val).replace(/"/g, '\\"');
		parts.push('-H', `"${key}: ${safeVal}"`);
	}

	if (body) {
		// escape single quotes for shell-safe single-quoted string
		const escaped = body.replace(/'/g, "'\\''");
		parts.push("--data-raw", `'${escaped}'`);
	}

	return parts.join(' ');
}

async function copyToClipboard(text: string) {
	if (navigator.clipboard && navigator.clipboard.writeText) {
		return navigator.clipboard.writeText(text);
	}
	// fallback for older environments
	const ta = document.createElement('textarea');
	ta.value = text;
	document.body.appendChild(ta);
	ta.select();
	try {
		document.execCommand('copy');
	} finally {
		document.body.removeChild(ta);
	}
	return Promise.resolve();
}

async function copyDeathCountAsCurl() {
	try {
		if (!deathCountData.levelID) {
			toast.error('Level ID is required');
			return;
		}
		const countString = deathCountArray.join('|');
		const url = `${import.meta.env.VITE_API_URL}/deathCount/${deathCountData.levelID}/${countString}${deathCountData.completed ? '?completed=true' : ''}`;
		const token = await $user.token();
		const cmd = await buildCurlCommand('POST', url, { Authorization: 'Bearer ' + token });
		await copyToClipboard(cmd);
		toast.success('Copied cURL to clipboard');
	} catch (err) {
		console.error(err);
		toast.error('Failed to copy cURL');
	}
}

async function copyEventSubmitAsCurl() {
	try {
		if (!eventSubmitData.levelID || !eventSubmitData.progress || !eventSubmitData.password) {
			toast.error('Level ID, Progress, and Password are required');
			return;
		}
		const url = `${import.meta.env.VITE_API_URL}/events/submitLevel/${eventSubmitData.levelID}?progress=${eventSubmitData.progress}&password=${encodeURIComponent(eventSubmitData.password)}`;
		const token = await $user.token();
		const cmd = await buildCurlCommand('PUT', url, { Authorization: 'Bearer ' + token });
		await copyToClipboard(cmd);
		toast.success('Copied cURL to clipboard');
	} catch (err) {
		console.error(err);
		toast.error('Failed to copy cURL');
	}
}

	function clearDeathCount() {
		deathCountData = {
			levelID: '',
			completed: false
		};
		deathCountArray = Array(100).fill(0);
		attempts = [];
		attemptPercent = '';
		attemptCount = '';
		deathCountResponse = '';
	}

	function clearEventSubmit() {
		eventSubmitData = {
			levelID: '',
			progress: '',
			password: ''
		};
		eventSubmitResponse = '';
	}
</script>

<svelte:head>
	<title>API Tester - Admin</title>
</svelte:head>

<Title value="API Tester" />

<div class="wrapper">
	<Tabs.Root value="deathCount" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="deathCount">Death Count</Tabs.Trigger>
			<Tabs.Trigger value="eventSubmit">Event Submit Level</Tabs.Trigger>
		</Tabs.List>

		<!-- Death Count Tab -->
		<Tabs.Content value="deathCount">
			<Card.Root>
				<Card.Header>
					<Card.Title>Send Death Count Update</Card.Title>
					<Card.Description>
						POST /deathCount/{'{levelID}'}/{'{count}'}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="form-group">
						<Label for="dc-levelID">Level ID *</Label>
						<Input
							id="dc-levelID"
							bind:value={deathCountData.levelID}
							placeholder="e.g., 123"
							type="number"
							disabled={deathCountLoading}
						/>
						<p class="helper-text">The ID of the level</p>
					</div>

					<div class="form-group">
						<Label>Add Attempt</Label>
						<p class="helper-text">
							Log death attempts at specific checkpoints. The count will be added to the checkpoint.
						</p>
						<div class="attempt-input-row">
							<div class="attempt-field">
								<Label for="attempt-percent">Percent (0-99)</Label>
								<Input
									id="attempt-percent"
									type="number"
									bind:value={attemptPercent}
									min="0"
									max="99"
									placeholder="0"
									disabled={deathCountLoading}
								/>
							</div>
							<div class="attempt-field">
								<Label for="attempt-count">Count</Label>
								<Input
									id="attempt-count"
									type="number"
									bind:value={attemptCount}
									min="0"
									placeholder="1"
									disabled={deathCountLoading}
								/>
							</div>
							<Button 
								on:click={addAttempt} 
								disabled={deathCountLoading}
								class="self-end"
							>
								Add Attempt
							</Button>
						</div>
					</div>

					{#if attempts.length > 0}
						<div class="form-group">
							<Label>Attempt Log ({attempts.length} attempts)</Label>
							<div class="attempts-list">
								{#each attempts as attempt, index}
									<div class="attempt-item">
										<span class="attempt-info">
											<strong>{attempt.percent}%</strong> → +{attempt.count} deaths
										</span>
										<Button 
											variant="destructive" 
											size="sm" 
											on:click={() => removeAttempt(index)}
											disabled={deathCountLoading}
										>
											Remove
										</Button>
									</div>
								{/each}
							</div>
						</div>

						<div class="form-group">
							<Label>Current Death Count Array (Non-zero values)</Label>
							<div class="array-summary">
								{#each deathCountArray as value, index}
									{#if value > 0}
										<span class="array-value">{index}%: {value}</span>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<div class="form-group">
						<Label>Preview (Pipe-separated format)</Label>
						<Textarea 
							value={deathCountArray.join('|')} 
							readonly 
							rows={3} 
							class="font-mono text-sm"
						/>
					</div>

					<div class="form-group flex items-center space-x-2">
                        <input
                            id="dc-completed"
                            type="checkbox"
                            bind:checked={deathCountData.completed}
                            disabled={deathCountLoading}
                        />
						<Label for="dc-completed" class="cursor-pointer">
							Mark as Completed (sets completedTime to current time)
						</Label>
					</div>

					{#if deathCountResponse}
						<div class="form-group">
							<Label>Response:</Label>
							<Textarea value={deathCountResponse} readonly rows={10} class="font-mono text-sm" />
						</div>
					{/if}
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" on:click={clearDeathCount} disabled={deathCountLoading}>
						Clear
					</Button>
					<div class="flex items-center space-x-2">
						<Button variant="outline" on:click={copyDeathCountAsCurl} disabled={deathCountLoading}>
							Copy as cURL
						</Button>
						<Button on:click={simulateDeathCount} disabled={deathCountLoading}>
							{deathCountLoading ? 'Sending...' : 'Send'}
						</Button>
					</div>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Event Submit Level Tab -->
		<Tabs.Content value="eventSubmit">
			<Card.Root>
				<Card.Header>
					<Card.Title>Send Event Level Submission</Card.Title>
					<Card.Description>
						PUT /events/submitLevel/{'{levelID}'}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="form-group">
						<Label for="es-levelID">Level ID *</Label>
						<Input
							id="es-levelID"
							bind:value={eventSubmitData.levelID}
							placeholder="e.g., 456"
							type="number"
							disabled={eventSubmitLoading}
						/>
						<p class="helper-text">The ID of the level to submit</p>
					</div>

					<div class="form-group">
						<Label for="es-progress">Progress *</Label>
						<Input
							id="es-progress"
							bind:value={eventSubmitData.progress}
							placeholder="e.g., 100"
							type="number"
							min="0"
							max="100"
							disabled={eventSubmitLoading}
						/>
						<p class="helper-text">Completion progress (0-100)</p>
					</div>

					<div class="form-group">
						<Label for="es-password">Submit Password *</Label>
						<Input
							id="es-password"
							bind:value={eventSubmitData.password}
							placeholder="Enter submit password"
							type="password"
							disabled={eventSubmitLoading}
						/>
						<p class="helper-text">Authentication password for submission</p>
					</div>

					{#if eventSubmitResponse}
						<div class="form-group">
							<Label>Response:</Label>
							<Textarea value={eventSubmitResponse} readonly rows={10} class="font-mono text-sm" />
						</div>
					{/if}
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" on:click={clearEventSubmit} disabled={eventSubmitLoading}>
						Clear
					</Button>
					<div class="flex items-center space-x-2">
						<Button variant="outline" on:click={copyEventSubmitAsCurl} disabled={eventSubmitLoading}>
							Copy as cURL
						</Button>
						<Button on:click={simulateEventSubmit} disabled={eventSubmitLoading}>
							{eventSubmitLoading ? 'Simulating...' : 'Send'}
						</Button>
					</div>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<style lang="scss">
	.wrapper {
		max-width: 900px;
		margin: 2rem auto;
		padding: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;

		:global(.helper-text) {
			font-size: 0.875rem;
			color: var(--muted-foreground);
			margin-top: 0.25rem;
		}
	}

	.attempt-input-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-top: 0.5rem;
	}

	.attempt-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.attempts-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 300px;
		overflow-y: auto;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	.attempt-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.attempt-info {
		font-size: 0.875rem;
		
		strong {
			color: var(--primary);
		}
	}

	.array-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 0.5rem;
		margin-top: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.array-value {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	:global(.font-mono) {
		font-family: 'Courier New', monospace;
	}
</style>
