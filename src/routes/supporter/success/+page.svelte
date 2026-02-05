<script>
	import { page } from '$app/stores';
	import { Confetti } from 'svelte-confetti';

	const id = $page.url.searchParams.get('id');
</script>

<svelte:head>
	<title>Success!</title>
</svelte:head>
<div
	style="
 position: fixed;
 top: -50px;
 left: 0;
 height: 100vh;
 width: 100vw;
 display: flex;
 justify-content: center;
 overflow: hidden;
 pointer-events: none;"
>
	<Confetti
		x={[-5, 5]}
		y={[0, 0.1]}
		delay={[500, 2000]}
		infinite
		duration={5000}
		amount={500}
		fallDistance="100vh"
	/>
</div>
<div class="flex h-[100vh] flex-col items-center justify-center text-center pl-[10px] pr-[10px]">
	<div class="mb-[100px] h-[200px] w-[200px] rounded-full bg-green-500 shadow-xl">
		<img class="invert" src="/tick-svgrepo-com.svg" alt="tick" />
	</div>
	<h1 class="mb-[10px] text-5xl">Payment Success</h1>
	<p class="text-lg">Thank you for supporting the development of Geometry Dash VN!</p>
	<p class="text-lg">Order ID: {id}</p>
</div>
