<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { locale } from 'svelte-i18n';
	import { Gamepad2, ImagePlus, PencilLine } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import supabase from '$lib/client/supabase';
	import * as Avatar from '$lib/components/ui/avatar';

	const dispatch = createEventDispatcher<{ created: any; }>();

	let content = '';
	let posting = false;

	$: canPost = content.trim().length > 0 && !posting;

	function text(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function avatarUrl(player: any) {
		return `https://cdn.gdvn.net/avatars/${player.uid}${
			isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
		}?version=${player.avatarVersion || 0}`;
	}

	function postParts(value: string) {
		const normalized = value.trim();
		const firstLine = normalized.split(/\r?\n/, 1)[0].trim();
		const titleLimit = 120;
		const title = firstLine.length > titleLimit
			? `${firstLine.slice(0, titleLimit - 1)
				.trimEnd()}…`
			: firstLine;
		const remaining = firstLine.length > titleLimit
			? normalized.slice(titleLimit - 1)
				.trim()
			: normalized.slice(firstLine.length)
				.trim();

		return { title, content: remaining };
	}

	async function publishPost() {
		if (!canPost || !$user.loggedIn) {
			return;
		}

		posting = true;

		try {
			const token = await $user.token();
			const parts = postParts(content);
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/community/posts`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						title: parts.title,
						content: parts.content,
						type: 'discussion'
					})
				}
			);
			const result = await response.json()
				.catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					result.error
					|| text('Could not publish your post.', 'Không thể đăng bài viết.')
				);
			}

			content = '';
			toast.success(text('Post published!', 'Đã đăng bài viết!'));
			dispatch('created', result);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Could not publish your post.', 'Không thể đăng bài viết.')
			);
		} finally {
			posting = false;
		}
	}

	async function signIn() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				},
				redirectTo: window.location.origin
			}
		});
	}
</script>

<section class="quick-post" aria-label={text('Create a post', 'Tạo bài viết')}>
  {#if !$user.checked}
    <span class="composer-avatar-skeleton" aria-hidden="true"></span>
    <div class="composer-loading" aria-hidden="true">
      <span></span>
      <span></span>
    </div>
  {:else if $user.loggedIn && $user.data}
    <a
      class="composer-avatar-link"
      href={`/player/${$user.data.uid}`}
      aria-label={text('Open your profile', 'Mở trang cá nhân của bạn')}
    >
      <Avatar.Root class="composer-avatar">
        <Avatar.Image
          class="object-cover"
          src={avatarUrl($user.data)}
          alt={$user.data.name || ''}
        />
        <Avatar.Fallback>{$user.data.name?.[0] || '?'}</Avatar.Fallback>
      </Avatar.Root>
    </a>

    <div class="composer-body">
      <textarea
        bind:value={content}
        rows="2"
        maxlength="2000"
        placeholder={text("What's happening?", 'Bạn đang nghĩ gì?')}
        aria-label={text('Post content', 'Nội dung bài viết')}
        on:keydown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void publishPost();
          }
        }}
      ></textarea>

      <div class="composer-actions">
        <div class="composer-tools">
          <a
            href="/community/create"
            aria-label={text('Create a post with an image', 'Tạo bài viết có hình ảnh')}
            title={text('Add media', 'Thêm media')}
          >
            <ImagePlus size={18} />
          </a>
          <a
            href="/community/create"
            aria-label={text('Attach a level or record', 'Đính kèm level hoặc record')}
            title={text('Attach a level or record', 'Đính kèm level hoặc record')}
          >
            <Gamepad2 size={18} />
          </a>
          <a class="more-options" href="/community/create">
            <PencilLine size={16} />
            <span>{text('More options', 'Tùy chọn khác')}</span>
          </a>
        </div>

        <button
          class="post-button"
          type="button"
          disabled={!canPost}
          on:click={publishPost}
        >
          {posting ? text('Posting…', 'Đang đăng…') : text('Post', 'Đăng')}
        </button>
      </div>
    </div>
  {:else}
    <span class="guest-avatar" aria-hidden="true"><PencilLine size={19} /></span>
    <button class="guest-composer" type="button" on:click={signIn}>
      <strong>{text("What's happening?", 'Bạn đang nghĩ gì?')}</strong>
      <span>{text('Sign in to share with the community', 'Đăng nhập để chia sẻ với cộng đồng')}</span>
    </button>
  {/if}
</section>

<style lang="scss">
.quick-post {
  display: flex;
  min-height: 112px;
  gap: 12px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid var(--feed-border, hsl(var(--border)));
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
}

.composer-avatar-link {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
  color: inherit;
  text-decoration: none;
}

:global(.composer-avatar) {
  width: 42px;
  height: 42px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.composer-body {
  min-width: 0;
  flex: 1;
}

textarea {
  display: block;
  width: 100%;
  min-height: 52px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: transparent;
  color: hsl(var(--foreground));
  font: inherit;
  font-size: 16px;
  line-height: 1.45;

  &::placeholder {
    color: hsl(var(--muted-foreground));
    opacity: 0.88;
  }
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border) / 0.72);
}

.composer-tools {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 3px;

  a {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 50%;
    color: hsl(199 89% 48%);
    text-decoration: none;
  }

  .more-options {
    display: inline-flex;
    width: auto;
    gap: 6px;
    padding: 0 8px;
    border-radius: 8px;
    color: hsl(var(--muted-foreground));
    font-size: 11px;
    font-weight: 700;
  }
}

.post-button {
  min-width: 72px;
  min-height: 34px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid #fff;
  border-radius: 999px;
  background: #fff;
  color: #0b0f19;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.guest-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 50%;
  background: hsl(199 89% 48% / 0.12);
  color: hsl(199 89% 48%);
}

.guest-composer {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  border: 0;
  background: transparent;
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;

  strong {
    font-size: 15px;
    font-weight: 700;
  }

  span {
    margin-top: 3px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
  }
}

.composer-avatar-skeleton,
.composer-loading span {
  display: block;
  background:
    linear-gradient(100deg, transparent 20%, hsl(var(--background) / 0.62) 42%, transparent 64%),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: composer-shimmer 1.35s linear infinite;
}

.composer-avatar-skeleton {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
}

.composer-loading {
  display: flex;
  flex: 1;
  justify-content: center;
  flex-direction: column;
  gap: 11px;

  span {
    width: 72%;
    height: 12px;
    border-radius: 999px;
  }

  span:last-child {
    width: 38%;
  }
}

@keyframes composer-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (max-width: 640px) {
  .quick-post {
    margin: 0 0 8px;
    padding: 14px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .more-options span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .composer-avatar-skeleton,
  .composer-loading span {
    animation: none;
  }
}
</style>
