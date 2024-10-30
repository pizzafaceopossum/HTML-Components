function saveHTML(element, options = {}) {
	const timestamp = (new Date())
	.toLocaleString('en-gb', { hour12: false, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', })
	.replaceAll(', ', ',')
	.replaceAll(' ', '_')
	.replaceAll(',', ' ')
	.replaceAll(':', '-');

	const filename = options.filename || '';

	const html = ArraytoHTML(HTMLtoArray(element.innerHTML), options);

	const blob = new Blob([html.trim()], { type: 'text/html' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename + timestamp + '.xml';
	a.click();

	URL.revokeObjectURL(url);
}