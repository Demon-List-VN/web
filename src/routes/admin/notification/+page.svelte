<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	let notification = {
		to: '',
		content: '',
		redirect: '',
		status: 0
	};

	let isLoading = false;
	let selectedPlayer: any = null;

	$: notification.to = selectedPlayer ? selectedPlayer.uid : '';

	function validate() {
		const missing: string[] = [];

		if (!notification.to || String(notification.to).trim() === '') {
			missing.push('Recipient UID');
		}

		if (!notification.content || String(notification.content).trim() === '') {
			missing.push('Content');
		}

		if (missing.length) {
			throw new Error(`Missing required fields: ${missing.join(', ')}`);
		}
	}

	async function sendNotification() {
		try {
			validate();

			isLoading = true;

			const payload: any = {
				to: notification.to.trim(),
				content: notification.content.trim(),
				status: notification.status
			};

			if (notification.redirect && notification.redirect.trim() !== '') {
				payload.redirect = notification.redirect.trim();
			}

			const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + (await $user.token())
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				throw new Error(`Failed to send notification: ${response.statusText}`);
			}

			toast.success('Notification sent successfully!');

			// Reset form
			notification = {
				to: '',
				content: '',
				redirect: '',
				status: 0
			};
		} catch (error: any) {
			toast.error(error.message || 'Failed to send notification');
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Send Notification - Admin</title>
</svelte:head>

<Title value="Send Notification" />

<div class="wrapper">
	<div class="form-container">
		<div class="form-group">
			<Label for="to">Recipient *</Label>
			<PlayerSelector bind:value={selectedPlayer} bind:disabled={isLoading} />
			<p class="helper-text">Select a user who will receive this notification</p>
		</div>

		<div class="form-group">
			<Label for="content">Content *</Label>
			<Textarea
				id="content"
				bind:value={notification.content}
				placeholder="Enter notification content"
				rows="5"
				disabled={isLoading}
			/>
			<p class="helper-text">The message content of the notification</p>
		</div>

		<div class="form-group">
			<Label for="redirect">Redirect URL (Optional)</Label>
			<Input
				id="redirect"
				type="text"
				bind:value={notification.redirect}
				placeholder="https://example.com or /relative/path"
				disabled={isLoading}
			/>
			<p class="helper-text">Optional link to redirect users when clicking the notification</p>
		</div>

		<div class="form-group">
			<Label for="status">Status</Label>
			<Input
				id="status"
				type="number"
				bind:value={notification.status}
				placeholder="0"
				disabled={isLoading}
			/>
			<p class="helper-text">Status code (default: 0)</p>
		</div>

		<div class="button-group">
			<Button on:click={sendNotification} disabled={isLoading}>
				{isLoading ? 'Sending...' : 'Send Notification'}
			</Button>
		</div>
	</div>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		padding-block: 20px;
		max-width: 800px;
	}

	.form-container {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.helper-text {
		font-size: 0.875rem;
		color: #888;
		margin: 0;
	}

	.button-group {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}
</style>
