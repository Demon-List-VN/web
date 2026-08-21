<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { user } from '$lib/client';
	import { locale } from 'svelte-i18n';
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

	let eligibilityMessages: Record<string, string>;

	$: eligibilityMessages = {
		ACCOUNT_BANNED: text('Your account is banned.', 'Tài khoản của bạn đã bị khóa.'),
		ORGANIZATION_ACCOUNT: text('Organization accounts cannot review records.', 'Tài khoản tổ chức không thể duyệt record.'),
		LEVEL_TOO_LOW: text('Reach global level 50 to unlock Overwatch.', 'Đạt level 50 để mở khóa Overwatch.'),
		OVERWATCH_BANNED: text('Your Overwatch access is suspended.', 'Quyền truy cập Overwatch của bạn đang bị khóa.')
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
			toast.error(error instanceof Error ? error.message : 'Failed to load Overwatch');
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
			const message = error instanceof Error ? error.message : 'Failed to retrieve a record';

			toast.error(message === 'NO_OVERWATCH_RECORD' ? 'No eligible record is available right now.' : message);
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
			toast.success('Verdict recorded. Thank you for reviewing.');
			await load();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit verdict');
		} finally {
			submitting = false;
		}
	}

	async function returnAssignment() {
		if (!state?.currentAssignment || !confirm('Return this record to the pool?')) {
			return;
		}

		returning = true;

		try {
			await returnOverwatchAssignment(
				await $user.token(),
				state.currentAssignment.assignmentId
			);
			toast.success('Record returned to the pool.');
			await load();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to return record');
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
  <title>Overwatch</title>
</svelte:head>

<Title value="Overwatch" />

<main class="overwatch-page">
  {#if loading}
    <div class="empty-card">{text('Loading Overwatch…', 'Đang tải Overwatch…')}</div>
  {:else if !$user.loggedIn}
    <div class="empty-card">{text('Sign in to view your Overwatch profile.', 'Đăng nhập để xem hồ sơ Overwatch.')}</div>
  {:else if state}
    <section class="hero">
      <div>
        <p class="eyebrow">{text('Community record review', 'Cộng đồng kiểm duyệt record')}</p>
        <h1>{text('Review without seeing the crowd', 'Đánh giá độc lập, không bị ảnh hưởng bởi số đông')}</h1>
        <p>{text('Assignments are anonymous and never reveal their review phase, previous votes or reviewer identities.', 'Assignment được ẩn danh và không tiết lộ giai đoạn, vote trước đó hay danh tính reviewer.')}</p>
      </div>
      <Badge variant={state.eligible ? 'default' : 'secondary'}>
        {state.eligible ? text('Eligible', 'Đủ điều kiện') : text('Unavailable', 'Không khả dụng')}
      </Badge>
    </section>

    <section class="stats">
      <article><span>Reputation</span><strong>{state.profile.reputationScore}</strong><small>{state.profile.reputationTier}</small></article>
      <article><span>Vote weight</span><strong>{state.profile.effectiveWeight.toFixed(2)}</strong><small>{state.profile.probation ? `${state.profile.probationReviewsLeft} probation reviews left` : 'Full weight active'}</small></article>
      <article><span>Completed</span><strong>{state.profile.completedReviews}</strong><small>Validated history</small></article>
      <article><span>Today</span><strong>{state.profile.limitLeft}/{state.profile.dailyLimit}</strong><small>Reviews remaining</small></article>
    </section>

    {#if !state.eligible}
      <section class="notice-card danger">
        <h2>{text('Overwatch is unavailable', 'Overwatch không khả dụng')}</h2>
        <p>{eligibilityMessages[state.eligibilityReason ?? ''] ?? 'This account is not eligible.'}</p>
        {#if state.profile.banned && state.profile.banReason}
          <p><strong>Reason:</strong> {state.profile.banReason}</p>
          <p>{state.profile.bannedUntil ? `Ends ${new Date(state.profile.bannedUntil)
.toLocaleString()}` : 'Permanent suspension'}</p>
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
      <section class="retrieve-card">
        <div>
          <h2>{text('Ready for the next record?', 'Sẵn sàng cho record tiếp theo?')}</h2>
          <p>{text('The system chooses a normal, audit or independent review without revealing which one.', 'Hệ thống tự chọn normal, audit hoặc independent review mà không tiết lộ loại assignment.')}</p>
        </div>
        <Button disabled={retrieving || state.profile.limitLeft <= 0} on:click={retrieve}>
          {retrieving ? text('Retrieving…', 'Đang lấy record…') : state.profile.limitLeft <= 0 ? text('Daily limit reached', 'Đã hết lượt hôm nay') : text('Retrieve record', 'Nhận record')}
        </Button>
      </section>
    {/if}

    <section class="rules-card">
      <h2>{text('Review rules', 'Quy tắc review')}</h2>
      <div class="rule-grid">
        <p><strong>Accept</strong><span>The submitted evidence clearly validates the record.</span></p>
        <p><strong>Reject</strong><span>The record is invalid. A concrete reason is required.</span></p>
        <p><strong>Unsure</strong><span>You cannot decide confidently from the available evidence.</span></p>
      </div>
    </section>
  {/if}
</main>

<style>
  .overwatch-page{max-width:1050px;margin:0 auto;padding:22px 18px 80px;display:grid;gap:18px}.hero,.retrieve-card{display:flex;align-items:center;justify-content:space-between;gap:22px;border:1px solid hsl(var(--border));border-radius:20px;background:linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55));padding:28px}.eyebrow{font-size:.72rem;text-transform:uppercase;letter-spacing:.13em;font-weight:800;color:hsl(var(--primary))}.hero h1{font-size:clamp(1.7rem,4vw,2.7rem);font-weight:850;letter-spacing:-.04em;margin:4px 0}.hero p:last-child,.retrieve-card p{max-width:680px;color:hsl(var(--muted-foreground))}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stats article{display:grid;gap:3px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--card));padding:17px}.stats span,.stats small{font-size:.78rem;color:hsl(var(--muted-foreground))}.stats strong{font-size:1.55rem}.notice-card,.rules-card,.empty-card{border:1px solid hsl(var(--border));border-radius:16px;background:hsl(var(--card));padding:22px}.danger{border-color:hsl(var(--destructive)/.45)}.notice-card h2,.retrieve-card h2,.rules-card h2{font-size:1.15rem;font-weight:750}.notice-card p{margin-top:7px;color:hsl(var(--muted-foreground))}.rule-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:13px}.rule-grid p{display:grid;gap:4px;border-radius:10px;background:hsl(var(--muted)/.5);padding:13px}.rule-grid span{font-size:.84rem;color:hsl(var(--muted-foreground))}@media(max-width:760px){.stats,.rule-grid{grid-template-columns:1fr 1fr}.hero,.retrieve-card{align-items:flex-start;flex-direction:column}}@media(max-width:480px){.stats,.rule-grid{grid-template-columns:1fr}.retrieve-card :global(button){width:100%}}
</style>
