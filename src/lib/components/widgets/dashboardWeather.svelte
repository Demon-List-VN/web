<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { _ } from 'svelte-i18n';

	let weather: {
		temp: number;
		location: string;
		condition: string;
		icon: string;
	} | null = null;
	let weatherLoading = true;
	let weatherError = false;
	let weatherLat: number | null = null;
	let weatherLon: number | null = null;

	// Settings
	let weatherEnabled = true;
	// Do not use geolocation by default — prefer manual default 'Hanoi'
	let weatherAutoDetect = false;
	let weatherLocationManual = 'Hanoi';

	const WEATHER_CODES: Record<number, { condition: string; icon: string; }> = {
		0: { condition: 'Clear', icon: '☀️' },
		1: { condition: 'Mainly Clear', icon: '🌤️' },
		2: { condition: 'Partly Cloudy', icon: '⛅' },
		3: { condition: 'Overcast', icon: '☁️' },
		45: { condition: 'Foggy', icon: '🌫️' },
		48: { condition: 'Icy Fog', icon: '🌫️' },
		51: { condition: 'Light Drizzle', icon: '🌧️' },
		53: { condition: 'Drizzle', icon: '🌧️' },
		55: { condition: 'Heavy Drizzle', icon: '🌧️' },
		61: { condition: 'Light Rain', icon: '🌧️' },
		63: { condition: 'Rain', icon: '🌧️' },
		65: { condition: 'Heavy Rain', icon: '🌧️' },
		71: { condition: 'Light Snow', icon: '🌨️' },
		73: { condition: 'Snow', icon: '🌨️' },
		75: { condition: 'Heavy Snow', icon: '🌨️' },
		80: { condition: 'Light Showers', icon: '🌦️' },
		81: { condition: 'Showers', icon: '🌦️' },
		82: { condition: 'Heavy Showers', icon: '🌦️' },
		95: { condition: 'Thunderstorm', icon: '⛈️' },
		96: { condition: 'Hail Storm', icon: '⛈️' },
		99: { condition: 'Heavy Hail', icon: '⛈️' }
	};

	async function fetchWeather() {
		if (!browser) {
			return;
		}

		// Respect user setting
		if (!weatherEnabled) {
			weather = null;
			weatherLoading = false;

			return;
		}

		try {
			weatherLoading = true;
			weatherError = false;

			let latitude: number | null = null;
			let longitude: number | null = null;

			if (weatherAutoDetect) {
				// Get user's location via Geolocation API
				const position = await new Promise<GeolocationPosition>(
					(resolve, reject) => {
						navigator.geolocation.getCurrentPosition(resolve, reject, {
							timeout: 5000
						});
					}
				);

				latitude = position.coords.latitude;
				longitude = position.coords.longitude;
			} else if (
				weatherLocationManual && weatherLocationManual.trim().length > 0
			) {
				// Geocode manual location using Nominatim
				const q = encodeURIComponent(weatherLocationManual.trim());
				const geoRes = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`
				);

				if (!geoRes.ok) {
					throw new Error('Geocoding failed');
				}

				const geoJson = await geoRes.json();

				if (Array.isArray(geoJson) && geoJson.length > 0) {
					latitude = parseFloat(geoJson[0].lat);
					longitude = parseFloat(geoJson[0].lon);
				} else {
					throw new Error('Could not find location');
				}
			} else {
				// No valid location provided -> fallback to default manual location (Hanoi)
				const fallback = 'Hanoi';
				const q = encodeURIComponent(fallback);
				const geoRes = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`
				);

				if (!geoRes.ok) {
					throw new Error('Geocoding failed');
				}

				const geoJson = await geoRes.json();

				if (Array.isArray(geoJson) && geoJson.length > 0) {
					latitude = parseFloat(geoJson[0].lat);
					longitude = parseFloat(geoJson[0].lon);
					weatherLocationManual = fallback;
				} else {
					throw new Error('Could not find location');
				}
			}

			// Save found coords and fetch weather data
			weatherLat = latitude;
			weatherLon = longitude;

			// Fetch weather data
			const weatherRes = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
			);

			if (!weatherRes.ok) {
				throw new Error('Weather fetch failed');
			}

			const weatherData = await weatherRes.json();

			// Reverse geocode to get location name (if manual location not provided)
			let locationName = weatherLocationManual || 'Your Location';

			if (weatherAutoDetect) {
				try {
					const reverseGeoRes = await fetch(
						`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
					);

					if (reverseGeoRes.ok) {
						const geoData = await reverseGeoRes.json();
						locationName = geoData.address?.city
							|| geoData.address?.town
							|| geoData.address?.village
							|| geoData.address?.county
							|| locationName;
					}
				} catch {
				// Keep provided location name
				}
			}

			const weatherCode = weatherData.current.weather_code;
			const weatherInfo = WEATHER_CODES[weatherCode]
				|| { condition: 'Unknown', icon: '🌡️' };

			weather = {
				temp: Math.round(weatherData.current.temperature_2m),
				location: locationName,
				condition: weatherInfo.condition,
				icon: weatherInfo.icon
			};
		} catch (e) {
			console.error('Failed to fetch weather:', e);
			weatherError = true;
			weather = null;
			weatherLat = null;
			weatherLon = null;
		} finally {
			weatherLoading = false;
		}
	}

	function loadSettingsFromStorage() {
		if (!browser) {
			return;
		}

		// Initialize weather enabled
		if (localStorage.getItem('dashboard.weatherEnabled') === null) {
			localStorage.setItem('dashboard.weatherEnabled', 'true');
		}

		const enabled = localStorage.getItem('dashboard.weatherEnabled');
		weatherEnabled = enabled === 'true';

		// Initialize auto detect (disabled by default)
		if (localStorage.getItem('dashboard.weatherAutoDetect') === null) {
			localStorage.setItem('dashboard.weatherAutoDetect', 'false');
		}

		const autoDetect = localStorage.getItem('dashboard.weatherAutoDetect');
		weatherAutoDetect = autoDetect === 'true';

		// Initialize manual location (default to Hanoi)
		if (localStorage.getItem('dashboard.weatherLocation') === null) {
			localStorage.setItem('dashboard.weatherLocation', 'Hanoi');
		}

		const manual = localStorage.getItem('dashboard.weatherLocation');
		weatherLocationManual = manual || 'Hanoi';
	}

	let storageHandler: (e: StorageEvent) => void;
	let customHandler: () => void;

	onMount(() => {
		loadSettingsFromStorage();

		// Only fetch if enabled
		if (weatherEnabled) {
			fetchWeather();
		}

		// Listen to storage events so settings dialog updates take effect (cross-tab)
		storageHandler = (e: StorageEvent) => {
			if (!e.key) {
				return;
			}

			if (e.key.startsWith('dashboard.weather')) {
				loadSettingsFromStorage();
				// Re-fetch when settings change
				fetchWeather();
			}
		};

		window.addEventListener('storage', storageHandler);

		// Also listen to a custom event for same-tab updates from settings dialog
		customHandler = () => {
			loadSettingsFromStorage();
			fetchWeather();
		};

		window.addEventListener(
			'dashboard.weather.updated',
			customHandler as EventListener
		);
	});

	onDestroy(() => {
		if (storageHandler) {
			window.removeEventListener('storage', storageHandler);
		}

		if (customHandler) {
			window.removeEventListener(
				'dashboard.weather.updated',
				customHandler as EventListener
			);
		}
	});

	// Construct a URL to AccuWeather; prefer coordinates for better search results when available
	$: accuUrl = weatherLat !== null && weatherLon !== null
		? `https://www.accuweather.com/en/search-locations?query=${
			encodeURIComponent(weatherLat + ',' + weatherLon)
		}`
		: weather && weather.location
		? `https://www.accuweather.com/en/search-locations?query=${
			encodeURIComponent(weather.location)
		}`
		: 'https://www.accuweather.com/';
</script>

{#if !weatherEnabled}
  <!-- Weather disabled by user -->
{:else if weatherLoading}
  <a
    href={accuUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="block"
    aria-label="Open AccuWeather"
  >
    <div class="cursor-pointer rounded-xl bg-background/60 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
      <div class="flex items-center gap-2">
        <Skeleton class="h-6 w-6 rounded-full" />
        <div class="space-y-1">
          <Skeleton class="h-4 w-12" />
          <Skeleton class="h-3 w-16" />
        </div>
      </div>
    </div>
  </a>
{:else if weather && !weatherError}
  <a
    href={accuUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="block"
    aria-label={`Open AccuWeather for ${weather?.location ?? 'location'}`}
  >
    <div class="cursor-pointer rounded-xl bg-background/60 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
      <div class="flex items-center gap-2">
        <span class="text-xl sm:text-2xl">{weather.icon}</span>
        <div>
          <div class="text-sm font-semibold sm:text-base">{weather.temp}°C</div>
          <div class="max-w-[80px] truncate text-[10px] text-muted-foreground sm:max-w-[100px] sm:text-xs">
            {weather.location}
          </div>
        </div>
      </div>
    </div>
  </a>
{:else}
  <!-- Fallback when weather is unavailable or permission denied -->
  <a
    href={accuUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="block"
    aria-label="Open AccuWeather"
  >
    <div class="cursor-pointer rounded-xl bg-background/60 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
      <div class="flex items-center gap-2">
        <span class="text-xl sm:text-2xl">🌡️</span>
        <div>
          <div class="text-sm font-semibold sm:text-base">—°C</div>
          <div class="max-w-[100px] truncate text-[10px] text-muted-foreground sm:text-xs">
            {$_('dashboard.weather_unavailable') || 'Weather unavailable'}
          </div>
        </div>
      </div>
    </div>
  </a>
{/if}
