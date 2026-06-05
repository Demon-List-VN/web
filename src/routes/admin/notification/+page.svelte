<script lang="ts">
	import { onMount } from 'svelte';
	import { Edit3, Plus, RefreshCw, Trash2, X } from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import type { SystemNotification } from '$lib/components/notifications/notification';

	type ManagerTab = 'user' | 'system';

	let activeTab: ManagerTab = 'user';
	let notification = {
		to: '',
		content: '',
		redirect: '',
		status: 0
	};
	let systemForm = createSystemForm();
	let systemNotifications: SystemNotification[] = [];

	let isLoading = false;
	let systemLoading = false;
	let systemSaving = false;
	let deletingSystemId = '';
	let selectedPlayer: any = null;

	$: notification.to = selectedPlayer ? selectedPlayer.uid : '';

	function defaultExpireAt() {
		const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		return toDatetimeLocal(date);
	}

	function createSystemForm(notification?: SystemNotification) {
		return {
			id: notification?.id ? String(notification.id) : '',
			title: notification?.title ?? '',
			content: notification?.content ?? '',
			redirect: notification?.redirect ?? '',
			expiresAt: notification
				? toDatetimeLocal(new Date(notification.expiresAt ?? notification.expires_at ?? ''))
				: defaultExpireAt(),
			enabled: notification?.enabled ?? true
		};
	}

	function toDatetimeLocal(date: Date) {
		if (Number.isNaN(date.getTime())) {
			return '';
		}

		const offset = date.getTimezoneOffset() * 60000;

		return new Date(date.getTime() - offset)
			.toISOString()
			.slice(0, 16);
	}

	function formatDate(value?: string | null) {
		if (!value) {
			return '-';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return '-';
		}

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		})
			.format(date);
	}

	function validateUserNotification() {
		const missing: string[] = [];

		if (!notification.to || String(notification.to)
			.trim() === '') {
			missing.push('Recipient UID');
		}

		if (!notification.content || String(notification.content)
			.trim() === '') {
			missing.push('Content');
		}

		if (missing.length) {
			throw new Error(`Missing required fields: ${missing.join(', ')}`);
		}
	}

	function validateSystemNotification() {
		if (!systemForm.content.trim()) {
			throw new Error('Content is required');
		}

		const expiresAt = new Date(systemForm.expiresAt);

		if (!systemForm.expiresAt || Number.isNaN(expiresAt.getTime())) {
			throw new Error('A valid expire date is required');
		}
	}

	async function authedFetch(path: string, init: RequestInit = {}) {
		const token = await $user.token();

		return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
			...init,
			headers: {
				...(init.headers || {}),
				Authorization: 'Bearer ' + token
			}
		});
	}

	async function sendNotification() {
		try {
			validateUserNotification();

			isLoading = true;

			const payload: any = {
				to: notification.to.trim(),
				content: notification.content.trim(),
				status: notification.status
			};

			if (notification.redirect && notification.redirect.trim() !== '') {
				payload.redirect = notification.redirect.trim();
			}

			const response = await authedFetch('/notifications', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				throw new Error(
					`Failed to send notification: ${response.statusText}`
				);
			}

			toast.success('Notification sent successfully!');

			notification = {
				to: '',
				content: '',
				redirect: '',
				status: 0
			};
			selectedPlayer = null;
		} catch (error: any) {
			toast.error(error.message || 'Failed to send notification');
		} finally {
			isLoading = false;
		}
	}

	async function loadSystemNotifications() {
		systemLoading = true;

		try {
			const response = await authedFetch('/notifications/system/manage');

			if (!response.ok) {
				throw new Error(`Failed to load system notifications: ${response.status}`);
			}

			const data = await response.json();
			systemNotifications = Array.isArray(data) ? data : [];
		} catch (error: any) {
			systemNotifications = [];
			toast.error(error.message || 'Failed to load system notifications');
		} finally {
			systemLoading = false;
		}
	}

	async function saveSystemNotification() {
		try {
			validateSystemNotification();

			systemSaving = true;

			const payload = {
				title: systemForm.title.trim() || null,
				content: systemForm.content.trim(),
				redirect: systemForm.redirect.trim() || null,
				expiresAt: new Date(systemForm.expiresAt)
					.toISOString(),
				enabled: systemForm.enabled
			};
			const path = systemForm.id
				? `/notifications/system/${encodeURIComponent(systemForm.id)}`
				: '/notifications/system';
			const response = await authedFetch(path, {
				method: systemForm.id ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				let message = `Failed to save system notification: ${response.status}`;

				try {
					const data = await response.json();
					message = data?.error || message;
				} catch {
				// Keep status fallback.
				}

				throw new Error(message);
			}

			toast.success(
				systemForm.id
					? 'System notification updated!'
					: 'System notification created!'
			);
			systemForm = createSystemForm();
			await loadSystemNotifications();
		} catch (error: any) {
			toast.error(error.message || 'Failed to save system notification');
		} finally {
			systemSaving = false;
		}
	}

	async function deleteSystemNotification(notification: SystemNotification) {
		const id = notification.id ? String(notification.id) : '';

		if (!id || !confirm('Delete this system notification?')) {
			return;
		}

		deletingSystemId = id;

		try {
			const response = await authedFetch(
				`/notifications/system/${encodeURIComponent(id)}`,
				{ method: 'DELETE' }
			);

			if (!response.ok) {
				throw new Error(`Failed to delete system notification: ${response.status}`);
			}

			toast.success('System notification deleted!');

			if (systemForm.id === id) {
				systemForm = createSystemForm();
			}

			await loadSystemNotifications();
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete system notification');
		} finally {
			deletingSystemId = '';
		}
	}

	onMount(() => {
		loadSystemNotifications();
	});
</script>

<svelte:head>
  <title>
    {$_('head.titles.send_notification')} - {$_('head.titles.admin')}
  </title>
</svelte:head>

<Title value="Notification Manager" />

<div class="wrapper">
  <div class="manager-tabs" role="tablist" aria-label="Notification manager">
    <button
      class:active={activeTab === 'user'}
      type="button"
      on:click={() => (activeTab = 'user')}
    >
      User Notification
    </button>
    <button
      class:active={activeTab === 'system'}
      type="button"
      on:click={() => (activeTab = 'system')}
    >
      System Notification
    </button>
  </div>

  {#if activeTab === 'user'}
    <div class="panel">
      <div class="form-container">
        <div class="form-group">
          <Label for="to">Recipient *</Label>
          <PlayerSelector bind:value={selectedPlayer} bind:disabled={isLoading} />
          <p class="helper-text">
            Select a user who will receive this notification
          </p>
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
          <p class="helper-text">
            Optional link to redirect users when clicking the notification
          </p>
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
  {:else}
    <div class="system-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>{systemForm.id ? 'Edit system notification' : 'Create system notification'}</h2>
            <p>System notifications appear for every logged-in user until they expire.</p>
          </div>
          {#if systemForm.id}
            <Button variant="ghost" size="icon" on:click={() => (systemForm = createSystemForm())}>
              <X size={16} />
            </Button>
          {/if}
        </div>

        <div class="form-container">
          <div class="form-group">
            <Label for="system-title">Title</Label>
            <Input
              id="system-title"
              bind:value={systemForm.title}
              placeholder="Optional short title"
              disabled={systemSaving}
            />
          </div>

          <div class="form-group">
            <Label for="system-content">Content *</Label>
            <Textarea
              id="system-content"
              bind:value={systemForm.content}
              placeholder="Enter system notification content"
              rows="5"
              disabled={systemSaving}
            />
          </div>

          <div class="form-group">
            <Label for="system-redirect">Redirect URL</Label>
            <Input
              id="system-redirect"
              bind:value={systemForm.redirect}
              placeholder="https://example.com or /relative/path"
              disabled={systemSaving}
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <Label for="system-expires">Expire date *</Label>
              <Input
                id="system-expires"
                type="datetime-local"
                bind:value={systemForm.expiresAt}
                disabled={systemSaving}
              />
            </div>
            <label class="checkbox-row">
              <input
                type="checkbox"
                bind:checked={systemForm.enabled}
                disabled={systemSaving}
              />
              Enabled
            </label>
          </div>

          <div class="button-group">
            <Button on:click={saveSystemNotification} disabled={systemSaving}>
              <Plus size={16} />
              {systemSaving
                ? 'Saving...'
                : systemForm.id
                  ? 'Update System Notification'
                  : 'Create System Notification'}
            </Button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>System notifications</h2>
            <p>{systemNotifications.length} total</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            on:click={loadSystemNotifications}
            disabled={systemLoading}
          >
            <RefreshCw size={16} />
          </Button>
        </div>

        {#if systemLoading}
          <div class="empty-state">Loading system notifications...</div>
        {:else if systemNotifications.length === 0}
          <div class="empty-state">No system notifications yet.</div>
        {:else}
          <div class="system-list">
            {#each systemNotifications as item (item.id)}
              <article class="system-item" class:disabled={!item.enabled}>
                <div class="system-item-main">
                  <div class="system-item-topline">
                    <strong>{item.title || 'Untitled notification'}</strong>
                    <span class:expired={new Date(item.expiresAt ?? item.expires_at ?? '')
                      .getTime() <= Date.now()}>
                      Expires {formatDate(item.expiresAt ?? item.expires_at)}
                    </span>
                  </div>
                  <p>{item.content}</p>
                  {#if item.redirect}
                    <a href={item.redirect} target="_blank" rel="noreferrer">{item.redirect}</a>
                  {/if}
                </div>
                <div class="system-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    on:click={() => (systemForm = createSystemForm(item))}
                  >
                    <Edit3 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    on:click={() => deleteSystemNotification(item)}
                    disabled={deletingSystemId === String(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.wrapper {
  padding-inline: 75px;
  padding-block: 20px;
  max-width: 1180px;
}

.manager-tabs {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  border: 1px solid var(--border1);
  border-radius: 8px;
  background: rgb(255 255 255 / 3%);

  button {
    height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--textColor2);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;

    &.active {
      background: hsl(var(--accent));
      color: var(--textColor);
    }
  }
}

.panel,
.form-container {
  margin-top: 20px;
}

.panel {
  border: 1px solid var(--border1);
  border-radius: 8px;
  padding: 18px;
  background: rgb(255 255 255 / 2%);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1rem;
    font-weight: 800;
  }

  p {
    margin-top: 4px;
    color: var(--textColor2);
    font-size: 0.875rem;
  }
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 18px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--textColor);
  font-size: 0.9rem;
  font-weight: 700;
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

.system-grid {
  display: grid;
  grid-template-columns: minmax(320px, 440px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.empty-state {
  display: grid;
  min-height: 160px;
  place-items: center;
  color: var(--textColor2);
  font-size: 0.9rem;
}

.system-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.system-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border1);
  border-radius: 8px;

  &.disabled {
    opacity: 0.62;
  }
}

.system-item-main {
  min-width: 0;
  display: grid;
  gap: 7px;

  p {
    margin: 0;
    color: var(--textColor);
    font-size: 0.9rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
    white-space: pre-line;
  }

  a {
    color: #7cb4f8;
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }
}

.system-item-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  span {
    flex: 0 0 auto;
    color: var(--textColor2);
    font-size: 0.75rem;

    &.expired {
      color: #ef4444;
    }
  }
}

.system-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 900px) {
  .wrapper {
    padding-inline: 16px;
  }

  .system-grid,
  .form-row {
    grid-template-columns: 1fr;
  }

  .system-item,
  .system-item-topline {
    display: grid;
  }
}
</style>
