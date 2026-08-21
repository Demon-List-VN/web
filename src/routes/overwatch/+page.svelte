<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';
	import { locale } from 'svelte-i18n';
	import {
		AlertTriangle,
		CheckCircle2,
		Clock3,
		Gauge,
		Inbox,
		Loader2,
		Scale,
		ShieldCheck
	} from 'lucide-svelte';
	import AssignmentReview from './AssignmentReview.svelte';
	import {
		getOverwatchMe,
		retrieveOverwatchAssignment,
		returnOverwatchAssignment,
		submitOverwatchVote,
		type OverwatchMe,
		type OverwatchVerdict
	} from '$lib/client/overwatch';

	let state: OverwatchMe | null = null;
	let loading = true;
	let retrieving = false;
	let submitting = false;
	let returning = false;
	let loadedUid: string | null = null;

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function formatDate(value: string) {
		return new Intl.DateTimeFormat($locale === 'vi' ? 'vi-VN' : 'en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		})
			.format(new Date(value));
	}

	function tierLabel(tier: string) {
		const labels: Record<string, [string, string]> = {
			New: ['New', 'Mới'],
			Established: ['Established', 'Ổn định'],
			Reliable: ['Reliable', 'Tin cậy'],
			Veteran: ['Veteran', 'Kỳ cựu'],
			Elite: ['Elite', 'Tinh nhuệ']
		};
		const label = labels[tier];

		return label ? text(label[0], label[1]) : tier;
	}

	function errorMessage(error: unknown, fallbackEn: string, fallbackVi: string) {
		const raw = error instanceof Error ? error.message : '';
		const errors: Record<string, [string, string]> = {
			NO_OVERWATCH_RECORD: [
				'No eligible record is available right now.',
				'Hiện chưa có bản ghi phù hợp để kiểm duyệt.'
			],
			OVERWATCH_NOT_ELIGIBLE: [
				'This account is not eligible for Overwatch.',
				'Tài khoản này chưa đủ điều kiện tham gia Overwatch.'
			],
			OVERWATCH_BANNED: [
				'Your Overwatch access is suspended.',
				'Quyền truy cập Overwatch của bạn đang bị đình chỉ.'
			],
			OVERWATCH_DAILY_LIMIT: [
				'You have reached today\'s review limit.',
				'Bạn đã dùng hết lượt kiểm duyệt hôm nay.'
			],
			OVERWATCH_RETURN_LIMIT: [
				'You have reached today\'s return limit.',
				'Bạn đã dùng hết lượt trả bản ghi hôm nay.'
			],
			ASSIGNMENT_NOT_FOUND: [
				'This assignment no longer exists.',
				'Nhiệm vụ kiểm duyệt này không còn tồn tại.'
			],
			ASSIGNMENT_NOT_ACTIVE: [
				'This assignment is no longer active.',
				'Nhiệm vụ kiểm duyệt này không còn hiệu lực.'
			],
			ASSIGNMENT_EXPIRED: [
				'This assignment has expired.',
				'Nhiệm vụ kiểm duyệt này đã hết hạn.'
			],
			INVALID_VERDICT: [
				'Please choose a valid decision.',
				'Vui lòng chọn một quyết định hợp lệ.'
			],
			REJECT_REASON_REQUIRED: [
				'A rejection reason is required.',
				'Bạn cần nêu lý do từ chối.'
			]
		};
		const translated = errors[raw];

		return translated ? text(translated[0], translated[1]) : (raw || text(fallbackEn, fallbackVi));
	}

	let eligibilityMessages: Record<string, string>;

	$: eligibilityMessages = {
		ACCOUNT_BANNED: text('Your account is banned.', 'Tài khoản của bạn đã bị khóa.'),
		ORGANIZATION_ACCOUNT: text(
			'Organization accounts cannot review records.',
			'Tài khoản tổ chức không thể kiểm duyệt bản ghi.'
		),
		LEVEL_TOO_LOW: text(
			'Reach global level 50 to unlock Overwatch.',
			'Đạt cấp độ toàn cầu 50 để mở khóa Overwatch.'
		),
		OVERWATCH_BANNED: text(
			'Your Overwatch access is suspended.',
			'Quyền truy cập Overwatch của bạn đang bị đình chỉ.'
		)
	};

	async function load() {
		if (!$user.loggedIn) {
			state = null;
			loading = false;

			return;
		}

		loading = true;

		try {
			state = await getOverwatchMe(await $user.token());
		} catch (error) {
			toast.error(errorMessage(error, 'Failed to load Overwatch.', 'Không thể tải Overwatch.'));
		} finally {
			loading = false;
		}
	}

	async function retrieve() {
		retrieving = true;

		try {
			const assignment = await retrieveOverwatchAssignment(await $user.token());

			if (state) {
				state.currentAssignment = assignment;
			}
		} catch (error) {
			toast.error(errorMessage(error, 'Failed to retrieve a record.', 'Không thể nhận bản ghi.'));
		} finally {
			retrieving = false;
		}
	}

	async function vote(verdict: OverwatchVerdict, reason: string) {
		if (!state?.currentAssignment) {
			return;
		}

		submitting = true;

		try {
			await submitOverwatchVote(
				await $user.token(),
				state.currentAssignment.assignmentId,
				verdict,
				reason,
				crypto.randomUUID()
			);
			toast.success(text(
				'Decision submitted. Thank you for reviewing.',
				'Đã gửi quyết định. Cảm ơn bạn đã kiểm duyệt.'
			));
			await load();
		} catch (error) {
			toast.error(errorMessage(error, 'Failed to submit your decision.', 'Không thể gửi quyết định.'));
		} finally {
			submitting = false;
		}
	}

	async function returnAssignment() {
		if (!state?.currentAssignment || !confirm(text(
			'Return this record to the review queue?',
			'Trả bản ghi này về hàng chờ kiểm duyệt?'
		))) {
			return;
		}

		returning = true;

		try {
			await returnOverwatchAssignment(
				await $user.token(),
				state.currentAssignment.assignmentId
			);
			toast.success(text(
				'The record was returned to the queue.',
				'Đã trả bản ghi về hàng chờ.'
			));
			await load();
		} catch (error) {
			toast.error(errorMessage(error, 'Failed to return the record.', 'Không thể trả bản ghi.'));
		} finally {
			returning = false;
		}
	}

	onMount(() => user.subscribe((currentUser) => {
		const uid = currentUser.loggedIn ? String(currentUser.data?.uid ?? '') : null;

		if (currentUser.checked && uid !== loadedUid) {
			loadedUid = uid;
			void load();
		}
	}));
</script>

<svelte:head>
  <title>{text('Overwatch review dashboard', 'Bảng kiểm duyệt Overwatch')}</title>
</svelte:head>

<main class="overwatch-page">
  {#if loading}
    <div class="page-state" aria-live="polite">
      <Loader2 class="state-icon spin" />
      <strong>{text('Loading review dashboard', 'Đang tải bảng kiểm duyệt')}</strong>
      <span>{text('Checking your account and current assignment…', 'Đang kiểm tra tài khoản và nhiệm vụ hiện tại…')}</span>
    </div>
  {:else if !$user.loggedIn}
    <div class="page-state">
      <ShieldCheck class="state-icon" />
      <strong>{text('Sign in required', 'Cần đăng nhập')}</strong>
      <span>{text('Sign in to access your Overwatch review dashboard.', 'Đăng nhập để truy cập bảng kiểm duyệt Overwatch của bạn.')}</span>
    </div>
  {:else if state}
    <section class="stats" aria-label={text('Review statistics', 'Thống kê kiểm duyệt')}>
      <article>
        <span class="stat-icon"><Gauge /></span>
        <div><span>{text('Reputation', 'Điểm uy tín')}</span><strong>{state.profile.reputationScore}</strong><small>{tierLabel(state.profile.reputationTier)}</small></div>
      </article>
      <article>
        <span class="stat-icon"><Scale /></span>
        <div>
          <span>{text('Vote weight', 'Trọng số phiếu')}</span>
          <strong>{state.profile.effectiveWeight.toFixed(2)}</strong>
          <small>{state.profile.probation
              ? text(
                `${state.profile.probationReviewsLeft} probation reviews left`,
                `Còn ${state.profile.probationReviewsLeft} lượt thử việc`
              )
              : text('Full weight active', 'Đang áp dụng trọng số đầy đủ')}</small>
        </div>
      </article>
      <article>
        <span class="stat-icon"><CheckCircle2 /></span>
        <div><span>{text('Completed', 'Đã hoàn thành')}</span><strong>{state.profile.completedReviews}</strong><small>{text('Validated reviews', 'Lượt kiểm duyệt hợp lệ')}</small></div>
      </article>
      <article>
        <span class="stat-icon"><Clock3 /></span>
        <div><span>{text('Remaining today', 'Còn lại hôm nay')}</span><strong>{state.profile.limitLeft}<em>/ {state.profile.dailyLimit}</em></strong><small>{text('Reviews available', 'Lượt có thể thực hiện')}</small></div>
      </article>
    </section>

    <div class="dashboard-grid">
      <div class="work-column">
        {#if !state.eligible}
          <section class="panel account-blocked">
            <div class="panel-title">
              <span class="panel-icon danger"><AlertTriangle /></span>
              <div>
                <h1>{text('Overwatch unavailable', 'Overwatch chưa khả dụng')}</h1>
                <p>{eligibilityMessages[state.eligibilityReason ?? ''] ?? text(
                    'This account is not eligible for Overwatch.',
                    'Tài khoản này chưa đủ điều kiện tham gia Overwatch.'
                  )}</p>
              </div>
            </div>
            {#if state.profile.banned && state.profile.banReason}
              <dl class="ban-details">
                <div><dt>{text('Reason', 'Lý do')}</dt><dd>{state.profile.banReason}</dd></div>
                <div>
                  <dt>{text('Duration', 'Thời hạn')}</dt>
                  <dd>{state.profile.bannedUntil
                      ? text(`Ends ${formatDate(state.profile.bannedUntil)}`, `Kết thúc lúc ${formatDate(state.profile.bannedUntil)}`)
                      : text('Permanent suspension', 'Đình chỉ vĩnh viễn')}</dd>
                </div>
              </dl>
            {/if}
          </section>
        {:else if state.currentAssignment}
          <AssignmentReview
            assignment={state.currentAssignment}
            {submitting}
            {returning}
            onVote={vote}
            onReturn={returnAssignment}
          />
        {:else}
          <section class="panel queue-panel">
            <div class="panel-bar">
              <div>
                <h1>{text('Review queue', 'Hàng chờ kiểm duyệt')}</h1>
                <p>{text('No record is assigned to you.', 'Bạn chưa được giao bản ghi nào.')}</p>
              </div>
              <span class="status-dot">{text('Ready', 'Sẵn sàng')}</span>
            </div>
            <div class="queue-empty">
              <span class="empty-icon"><Inbox /></span>
              <div>
                <strong>{text('Get a record to begin', 'Nhận một bản ghi để bắt đầu')}</strong>
                <p>{text(
                  'The system will assign an available record. Its review type and previous decisions remain hidden.',
                  'Hệ thống sẽ giao một bản ghi đang chờ. Loại kiểm duyệt và các quyết định trước đó luôn được ẩn.'
                )}</p>
              </div>
              <Button disabled={retrieving || state.profile.limitLeft <= 0} on:click={retrieve}>
                {#if retrieving}<Loader2 class="button-icon spin" />{/if}
                {retrieving
                  ? text('Getting record…', 'Đang nhận bản ghi…')
                  : state.profile.limitLeft <= 0
                    ? text('Daily limit reached', 'Đã hết lượt hôm nay')
                    : text('Get a record', 'Nhận bản ghi')}
              </Button>
            </div>
          </section>
        {/if}
      </div>

      <aside class="side-column">
        <section class="panel account-panel">
          <div class="side-heading">
            <h2>{text('Account status', 'Trạng thái tài khoản')}</h2>
            <span class:unavailable={!state.eligible} class="account-status">
              {state.eligible ? text('Eligible', 'Đủ điều kiện') : text('Unavailable', 'Chưa khả dụng')}
            </span>
          </div>
          <div class="account-row">
            <span>{text('Return allowance', 'Lượt trả bản ghi')}</span>
            <strong>{text(
              `${state.profile.returnLimitLeft} left today`,
              `Còn ${state.profile.returnLimitLeft} lượt hôm nay`
            )}</strong>
          </div>
          <p class="privacy-note"><ShieldCheck />{text(
            'Reviewer identities, review phases and previous decisions are hidden.',
            'Danh tính người kiểm duyệt, giai đoạn xử lý và các quyết định trước đó đều được ẩn.'
          )}</p>
        </section>

        <section class="panel rules-panel">
          <h2>{text('Decision guide', 'Hướng dẫn quyết định')}</h2>
          <div class="rule-list">
            <div><i class="accept"></i><p><strong>{text('Accept', 'Chấp nhận')}</strong><span>{text('The evidence clearly validates the record.', 'Bằng chứng xác nhận rõ ràng bản ghi là hợp lệ.')}</span></p></div>
            <div><i class="reject"></i><p><strong>{text('Reject', 'Từ chối')}</strong><span>{text('The record is invalid. A specific reason is required.', 'Bản ghi không hợp lệ. Bạn phải nêu lý do cụ thể.')}</span></p></div>
            <div><i class="unsure"></i><p><strong>{text('Unsure', 'Không chắc')}</strong><span>{text('The available evidence is not enough to decide.', 'Bằng chứng hiện có chưa đủ để đưa ra quyết định.')}</span></p></div>
          </div>
        </section>
      </aside>
    </div>
  {/if}
</main>

<style>
  .overwatch-page{width:min(100%,1240px);margin:0 auto;padding:30px 24px 72px;color:hsl(var(--foreground))}
  .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid hsl(var(--border));border-radius:10px;background:hsl(var(--card));overflow:hidden;margin-bottom:16px}
  .stats article{display:flex;align-items:center;gap:13px;min-width:0;padding:17px 18px;border-right:1px solid hsl(var(--border))}.stats article:last-child{border-right:0}.stats article>div{display:grid;min-width:0}.stats article div>span,.stats small{font-size:.76rem;color:hsl(var(--muted-foreground));line-height:1.35}.stats strong{font-size:1.35rem;line-height:1.2;font-variant-numeric:tabular-nums}.stats strong em{font-size:.78rem;font-style:normal;font-weight:600;color:hsl(var(--muted-foreground))}.stat-icon{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:7px;background:hsl(var(--muted));color:hsl(var(--muted-foreground))}.stat-icon :global(svg){width:17px;height:17px}
  .dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.work-column,.side-column{display:grid;gap:16px;min-width:0}.panel{border:1px solid hsl(var(--border));border-radius:10px;background:hsl(var(--card))}.panel-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:17px 20px;border-bottom:1px solid hsl(var(--border))}.panel-bar h1,.panel-title h1{font-size:1rem;font-weight:700}.panel-bar p,.panel-title p{margin-top:2px;font-size:.8rem;color:hsl(var(--muted-foreground))}.status-dot,.account-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:hsl(142 65% 45%/.12);padding:5px 9px;color:hsl(142 60% 39%);font-size:.7rem;font-weight:700;white-space:nowrap}.status-dot:before,.account-status:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}.account-status.unavailable{background:hsl(var(--destructive)/.1);color:hsl(var(--destructive))}
  .queue-empty{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px 24px}.empty-icon{display:grid;place-items:center;width:50px;height:50px;margin-bottom:16px;border:1px solid hsl(var(--border));border-radius:9px;background:hsl(var(--muted)/.5);color:hsl(var(--muted-foreground))}.empty-icon :global(svg){width:22px}.queue-empty strong{font-size:1rem}.queue-empty p{max-width:480px;margin:6px auto 20px;color:hsl(var(--muted-foreground));font-size:.86rem;line-height:1.55}:global(.button-icon){width:16px;height:16px;margin-right:7px}
  .side-column .panel{padding:17px}.side-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:17px}.side-heading h2,.rules-panel h2{font-size:.88rem;font-weight:700}.account-row{display:grid;gap:3px;padding:12px 0;border-top:1px solid hsl(var(--border));border-bottom:1px solid hsl(var(--border))}.account-row span{font-size:.74rem;color:hsl(var(--muted-foreground))}.account-row strong{font-size:.84rem}.privacy-note{display:flex;align-items:flex-start;gap:8px;margin-top:14px;color:hsl(var(--muted-foreground));font-size:.75rem;line-height:1.5}.privacy-note :global(svg){width:15px;height:15px;flex:0 0 15px;margin-top:1px}
  .rule-list{display:grid;margin-top:13px}.rule-list>div{display:flex;gap:11px;padding:12px 0;border-top:1px solid hsl(var(--border))}.rule-list i{width:7px;height:7px;flex:0 0 7px;border-radius:50%;margin-top:6px}.rule-list i.accept{background:#22a06b}.rule-list i.reject{background:#e5484d}.rule-list i.unsure{background:#d99a22}.rule-list p{display:grid;gap:2px}.rule-list strong{font-size:.8rem}.rule-list span{font-size:.74rem;line-height:1.45;color:hsl(var(--muted-foreground))}
  .page-state{min-height:460px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.page-state :global(.state-icon){width:30px;height:30px;margin-bottom:14px;color:hsl(var(--muted-foreground))}.page-state strong{font-size:1rem}.page-state span{margin-top:5px;color:hsl(var(--muted-foreground));font-size:.84rem}:global(.spin){animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .account-blocked{padding:22px}.panel-title{display:flex;align-items:flex-start;gap:13px}.panel-icon{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border-radius:7px;background:hsl(var(--muted));color:hsl(var(--muted-foreground))}.panel-icon.danger{background:hsl(var(--destructive)/.1);color:hsl(var(--destructive))}.panel-icon :global(svg){width:18px}.ban-details{display:grid;gap:10px;margin-top:20px;padding-top:17px;border-top:1px solid hsl(var(--border))}.ban-details div{display:grid;grid-template-columns:90px 1fr;gap:10px}.ban-details dt{color:hsl(var(--muted-foreground));font-size:.77rem}.ban-details dd{font-size:.82rem}
  @media(max-width:950px){.stats{grid-template-columns:1fr 1fr}.stats article:nth-child(2){border-right:0}.stats article:nth-child(-n+2){border-bottom:1px solid hsl(var(--border))}.dashboard-grid{grid-template-columns:1fr}.side-column{grid-template-columns:1fr 1fr}}
  @media(max-width:620px){.overwatch-page{padding:18px 12px 56px}.stats{grid-template-columns:1fr}.stats article{border-right:0;border-bottom:1px solid hsl(var(--border))}.stats article:nth-child(2){border-bottom:1px solid hsl(var(--border))}.stats article:last-child{border-bottom:0}.side-column{grid-template-columns:1fr}.panel-bar{align-items:flex-start}.queue-empty{min-height:300px}.queue-empty :global(button){width:100%}}
</style>
