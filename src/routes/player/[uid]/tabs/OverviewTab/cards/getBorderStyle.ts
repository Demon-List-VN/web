import { isActive } from '$lib/client/isSupporterActive';

export function getBorderStyle(player: any) {
	if (isActive(player.supporterUntil)) {
		const isDark = localStorage.getItem('theme') == 'dark';
		const bgColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';

		let style = `border-color: ${player.borderColor}; background-color: ${bgColor}`;

		if (player.borderColor) {
			style += `; box-shadow: 0 0 12px ${player.borderColor}40`;
		}

		return style;
	}

	return '';
}
