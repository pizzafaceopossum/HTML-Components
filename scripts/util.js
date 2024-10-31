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

	// Takes a style string and returns an array e.g. [{name: 'position', value: 'relative'}, {name: 'width', value: '150px'}]
function getStyleFromString(string) { return [...string.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups); }
	// Takes an object and returns a stringification e.g. {position: 'relative', width: '150px'} => "position:relative;width:150px;"
function styleStringFromObject(ob) { return Object.entries(ob).map(e=>e.join(':')).join(';'); }

	// Make a copy of a loaded component to be inserted somewhere.
function copyLoadedComponent(ctype)
{
	ctype = ctype.split('::');
	const ns = ctype[0].toLowerCase().trim();
	const type = ctype[1].trim();
	return loadedComponents[ns].document.querySelector(`cdefn[ctype="${type}"]`).cloneNode(true);
}

function getStyleClass(stype)
{
	const styleClass = {};
	stype = stype.split('::');
	const ns = stype[0];
	const type = stype[1];
	for (const styleAttr of loadedComponents[ns].document.querySelector(`styleclass[stype="${type}"]`).attributes.style.value.split(';').filter(e=>e))
	{
		const split = styleAttr.split(':').filter(e=>e);
		styleClass[split[0].trim()] = split[1].trim();
	};
	return styleClass;
}