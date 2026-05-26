export function playPvpBell() {
    if (typeof window === 'undefined') {
        return;
    }

    const audio = new Audio('/sounds/bell.mp3');
    audio.play()
        .catch(() => {
        // Browsers can block audio until the user has interacted with the page.
        });
}
