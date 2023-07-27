const API_KEY = '1tdFjefGLZaLitWZLtoGJF2oRadt0owE';

export default async function gifSearch(
	query,
	limit = 15,
	fetchOptions
) {
	const results = await fetch(
		`https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${query}&limit=${limit}&offset=0&rating=PG-13&lang=en`,
		fetchOptions
	);

	const data = await results.json();
	const gifs = data.data;

	return gifs.map(x => {
		const previewInfo = x.images['fixed_width'];
		const source = x.images.original;

		return {
			id: x.id,
			preview: {
				width: parseInt(previewInfo.width),
				height: parseInt(previewInfo.height),
				url: previewInfo.mp4,
			},
			original: {
				width: parseInt(source.width),
				height: parseInt(source.height),
				url: source.mp4,
			},
		};
	});
}
