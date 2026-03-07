interface Rating {
	progress: number;
	rating: number;
}

export function calcRating(ratings: Rating[], newRating: number | null = null) {
	const data = structuredClone(ratings);

	if (newRating !== null) {
		data.push({
			progress: 100,
			rating: newRating
		});
		data.sort((a, b) => {
			let x = a.rating,
				y = b.rating;

			if (a.progress != 100) {
				x = (x * a.progress) / 150;
			}

			if (a.progress != 100) {
				y = (y * b.progress) / 150;
			}

			return y - x;
		});
	}

	let res = 0;

	for (let i = 0; i < data.length; i++) {
		let tmp = data[i].rating;
		const top = i + 1;

		if (top == 1) {
			tmp *= 5 / 10;
		} else if (top == 2) {
			tmp *= 3 / 10;
		} else if (top == 3) {
			tmp *= 2 / 10;
		} else if (top <= 15) {
			tmp = Math.max(5, (tmp * 25) / top / 100);
		} else if (top <= 25) {
			tmp = 5;
		} else {
			tmp = 1;
		}

		if (data[i].progress != 100) {
			tmp *= 100 / 150;
		}

		res += Math.floor(tmp);
	}

	return res;
}
