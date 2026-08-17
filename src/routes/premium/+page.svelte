<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import { fade } from 'svelte/transition';
	import PaymentButton from '$lib/components/paymentButton.svelte';
	import { _ } from 'svelte-i18n';
	import SupporterTierProgress from '$lib/components/SupporterTierProgress.svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Alert from '$lib/components/ui/alert';
	import { AlertTriangle } from 'lucide-svelte';
</script>

<svelte:head>
  <title>{$_('head.titles.supporter')} - {$_('head.site_name')}</title>
  <meta
    property="og:title"
    content={`${$_('head.titles.supporter')} - ${$_('head.site_name')}`}
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div in:fade={{ delay: 300, duration: 1000 }}>
  <img
    class="bgGradient absolute z-0 h-[550px] w-full object-cover"
    src={'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
    alt="bg"
  />
</div>
<div class="relative flex flex-col items-center pl-[10px] pr-[10px]">
  <BigTitle
    value={$_('supporter.title')}
    description={$_('supporter.description')}
  />
  <div class="mt-[-20px] flex max-w-[1000px] flex-col items-center">
    <div class="flex flex-col items-center gap-[10px]">
      {#if !$user.loggedIn}
        <Alert.Root class="max-w-[500px] border-yellow-500/50 text-yellow-400">
          <AlertTriangle class="h-4 w-4" />
          <Alert.Title>{$_('supporter.login_required')}</Alert.Title>
        </Alert.Root>
      {/if}
      <PaymentButton title={$_('supporter.price')} />
    </div>

    <div class="tierProgressWrapper">
      {#if $user.loggedIn && isActive($user.data?.supporterUntil)}
        <SupporterTierProgress supporterUntil={$user.data.supporterUntil} />
      {:else}
        <SupporterTierProgress preview />
      {/if}
    </div>

    <h1 class="mb-[40px] mt-[75px] text-center text-3xl font-bold">
      {$_('supporter.perks.title')}
    </h1>
    <div class="flex flex-wrap justify-center gap-[10px]">
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{
            $_('supporter.perks.highlighted_name.title')
          }</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.highlighted_name.description')}
          </Card.Description>
        </Card.Header>
      </Card.Root>
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{$_('supporter.perks.animated_media.title')}</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.animated_media.description')}
          </Card.Description>
        </Card.Header>
      </Card.Root>
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{$_('supporter.perks.ads_free.title')}</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.ads_free.description')}
          </Card.Description>
        </Card.Header>
      </Card.Root>
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{$_('supporter.perks.short_url.title')}</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.short_url.description')}<br />
            Example: <a href="/@NamPE">gdvn.net/@NamPE</a>
          </Card.Description>
        </Card.Header>
      </Card.Root>
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{$_('supporter.perks.discord_role.title')}</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.discord_role.description')}
          </Card.Description>
        </Card.Header>
      </Card.Root>
      <Card.Root class="w-[300px]">
        <Card.Header>
          <Card.Title>{$_('supporter.perks.more_coming.title')}</Card.Title>
          <Card.Description class="w-[250px]">
            {$_('supporter.perks.more_coming.description')}
          </Card.Description>
        </Card.Header>
      </Card.Root>
    </div>
    <h1 class="mb-[40px] mt-[40px] text-center text-3xl font-bold">
      {$_('supporter.decision.title')}
    </h1>
    <PaymentButton title={$_('supporter.decision.button')} />
    <div class="mt-[100px] w-full pl-[10px] text-sm text-gray-400 lg:pl-[50px]">
      <p>{$_('supporter.notes.title')}</p>
      <ul>
        <li>- {$_('supporter.notes.non_recurring')}</li>
        <li>- {$_('supporter.notes.non_refundable')}</li>
        <li>- {$_('supporter.notes.extension')}</li>
        <li>- {$_('supporter.notes.duration')}</li>
      </ul>
    </div>
  </div>
</div>

<style lang="scss">
.bgGradient {
  filter: blur(175px);
  margin-top: -55px;
  mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
}

.tierProgressWrapper {
  width: 100%;
  max-width: 700px;
  margin-top: 24px;
}
</style>
