<script lang="ts">
	import BigTitle from '$lib/components/bigTitle.svelte';
	import Staff from '$lib/components/Staff.svelte';
</script>

<svelte:head>
	<title>About - Geometry Dash VN</title>
</svelte:head>

<BigTitle value="About" description="Geometry Dash VN maintainers and developers" />

<div class="wrapper">
	<p>Source code</p>
	<ul>
		<li>
			Frontend: <a href="https://github.com/NamPE286/DemonListVN-v3"
				>https://github.com/NamPE286/DemonListVN-v3</a
			>
		</li>
		<li>
			Backend: <a href="https://github.com/NamPE286/DemonListVN-v3-api"
				>https://github.com/NamPE286/DemonListVN-v3-api</a
			>
		</li>
		<li>Database: Supabase</li>
	</ul>
	<p>Staffs</p>
	<Staff
		staffName="Hito73"
		staffYT="https://www.youtube.com/channel/UCYw-j3PO02FCfEL-M-VZqGg"
		staffFB="https://www.facebook.com/thecloudsgiveway"
		staffGH="#!"
		staffAvatar="https://cdn.discordapp.com/attachments/1006116184703369216/1006136970340225074/unknown.png"
	/>

	<p>Developers</p>
	<Staff
		staffName="NamPE"
		staffYT="https://www.youtube.com/channel/UCCj7J4fxHF70n5zxccZQDww"
		staffFB="https://www.facebook.com/profile.php?id=100008542323249"
		staffGH="https://github.com/NamPE286"
		staffAvatar="https://avatars.githubusercontent.com/u/71075654?v=4"
	/>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 200px;

        a {
            text-decoration: underline;
        }

		ul {
			list-style: initial;
			margin: initial;
			padding: 0 0 0 40px;
		}

		li {
			display: list-item;
		}
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}
	}

	p {
		font-size: 30px;
		font-weight: 500;
		margin: 40px 0 0 32px;
	}
</style>
