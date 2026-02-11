export function getTitle(list: string, player: any) {
	if (list == 'dl') {
		if (player.overallRank <= 1) {
			return {
				title: 'AGM',
				fullTitle: 'Ascended Grandmaster',
				color: 'white;background: linear-gradient(to right, #ff00cc, #333399);'
			};
		}
		if (player.overallRank <= 5) {
			return {
				title: 'LGM',
				fullTitle: 'Legendary Grandmaster',
				color: 'darkred'
			};
		}
		if (player.overallRank <= 15) {
			return {
				title: 'GM',
				fullTitle: 'Grandmaster',
				color: 'red'
			};
		}
		if (player.rating >= 3500) {
			return {
				title: 'M',
				fullTitle: 'Master',
				color: 'hsla(321, 100%, 50%, 1)'
			};
		}
		if (player.rating >= 2500) {
			return {
				title: 'CM',
				fullTitle: 'Candidate Master',
				color: 'purple'
			};
		}
		if (player.rating >= 2000) {
			return {
				title: 'EX',
				fullTitle: 'Expert',
				color: 'blue'
			};
		}
		if (player.rating >= 1500) {
			return {
				title: 'SP',
				fullTitle: 'Specialist',
				color: 'darkcyan'
			};
		}
		if (player.rating >= 1000) {
			return {
				title: 'A',
				fullTitle: 'A',
				color: 'green'
			};
		}
		if (player.rating >= 500) {
			return {
				title: 'B',
				fullTitle: 'B',
				color: '#413cde'
			};
		}
		if (player.rating > 0) {
			return {
				title: 'C',
				fullTitle: 'C',
				color: 'gray'
			};
		}
		return null;
	}

	if (list == 'cl') {
		if (player.clrank <= 5) {
			return {
				title: 'V',
				fullTitle: 'Challenger V',
				color: 'darkred'
			};
		}
		if (player.clrank <= 15) {
			return {
				title: 'IV',
				fullTitle: 'Challenger IV',
				color: 'red'
			};
		}
		if (player.clRating >= 2500) {
			return {
				title: 'III',
				fullTitle: 'Challenger III',
				color: 'hsla(321, 100%, 50%, 1)'
			};
		}
		if (player.clRating >= 2000) {
			return {
				title: 'II',
				fullTitle: 'Challenger II',
				color: 'purple'
			};
		}
		if (player.clRating >= 1500) {
			return {
				title: 'I',
				fullTitle: 'Challenger I',
				color: 'blue'
			};
		}
		if (player.clRating >= 1000) {
			return {
				title: 'S',
				fullTitle: 'S',
				color: 'gold'
			};
		}
		if (player.clRating >= 600) {
			return {
				title: 'A',
				fullTitle: 'A',
				color: '#413cde'
			};
		}
		if (player.clRating >= 300) {
			return {
				title: 'B',
				fullTitle: 'B',
				color: 'gray'
			};
		}
		if (player.clRating > 0) {
			return {
				title: 'C',
				fullTitle: 'C',
				color: 'gray'
			};
		}
		return null;
	}

	if (list == 'elo') {
		if (player.matchCount < 5) {
			return {
				fullTitle: `Need ${5 - player.matchCount} more contest to be ranked`
			};
		}

		if (player.elo >= 2400) {
			return {
				fullTitle: 'Global Elite',
				title: 'GE',
				color: 'darkred'
			};
		}

		if (player.elo >= 2200) {
			return {
				fullTitle: 'Elite',
				title: 'E',
				color: 'red'
			};
		}

		if (player.elo >= 2000) {
			return {
				fullTitle: 'Eternal',
				title: 'ET',
				color: 'hsla(321, 100%, 50%, 1)'
			};
		}

		if (player.elo >= 1800) {
			return {
				fullTitle: 'Mythic',
				title: 'M',
				color: 'purple'
			};
		}

		if (player.elo >= 1600) {
			return {
				fullTitle: 'Diamond',
				title: 'DM',
				color: 'darkcyan'
			};
		}

		if (player.elo >= 1400) {
			return {
				fullTitle: 'Gold',
				title: 'GD',
				color: '#bda700'
			};
		}

		if (player.elo >= 1200) {
			return {
				fullTitle: 'Silver',
				title: 'SV',
				color: 'gray'
			};
		}

		if (player.elo >= 1000) {
			return {
				fullTitle: 'Iron',
				title: 'I',
				color: 'gray'
			};
		}

		return {
			fullTitle: 'Plastic',
			title: 'P',
			color: 'gray'
		};
	}
}
