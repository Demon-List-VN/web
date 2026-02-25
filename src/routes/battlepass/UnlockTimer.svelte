<script lang="ts">
  export let startDate: Date;
  export let unlockWeek: number;
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  const timeLeft = writable('');
  let interval: any;

  function updateTime() {
    const unlockDate = new Date(startDate.getTime() + unlockWeek * 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();
    if (diff <= 0) {
      timeLeft.set('Unlocked!');
      clearInterval(interval);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    let str = '';
    if (days > 0) str += `${days}d `;
    if (hours > 0 || days > 0) str += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m `;
    str += `${seconds}s`;
    timeLeft.set(str);
  }

  onMount(() => {
    updateTime();
    interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="font-mono text-primary text-lg">
  <span>Unlocks in {$timeLeft}</span>
</div>