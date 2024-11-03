function saveHTML(element, options = {}) {
	const timestamp = (new Date())
	.toLocaleString('en-gb', { hour12: false, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', })
	.replaceAll(', ', ',')
	.replaceAll(' ', '_')
	.replaceAll(',', ' ')
	.replaceAll(':', '-');

	const filename = options.filename || 'clipboard';
	

	const html = element.getHTML().trim();

	if (filename == 'clipboard')
	{
		navigator.clipboard.writeText(html);
		copy.disabled = true;
		copyNotif.style.display = "inline-block";
		setTimeout(() => {copy.disabled = false; copyNotif.style.display = "none"}, 2000);
	}
	else
	{
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename + timestamp + '.html';
		a.click();

		URL.revokeObjectURL(url);
	}
}

	// Takes a style string and returns an array e.g. [{name: 'position', value: 'relative'}, {name: 'width', value: '150px'}]
function getStyleFromString(string) { return [...string.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups); }
	// Takes an object and returns a stringification e.g. {position: 'relative', width: '150px'} => "position:relative;width:150px;"
function styleStringFromObject(ob) { return Object.entries(ob).map(e=>e.join(':')).join(';'); }

	// Make a copy of a loaded component to be inserted somewhere.
function copyLoadedComponent(ctype)
{
	ctype = ctype.split(':').filter(e=>e);
	const _ctype = [...ctype];	// For error info
	const ns = ctype.shift().toLowerCase().trim();
	ctype = ctype.pop().split('.').filter(e=>e);
	const type = ctype.pop().trim();
	
	
	if (loadedComponents[ns] === null)
	{
		throw ReferenceError(`Unrecognized namespace '${_ctype[0].trim()}' (From '${_ctype.join(':')}')`);
	}
	
	let section = loadedComponents[ns].document;

	for (let i in ctype)
	{
		const nextSection = section.querySelector(`cSection[ctype="${ctype[i]}"]`);
		if (nextSection === null)
		{
			throw ReferenceError(`Unrecognized section '${ns}:${ctype.toSpliced(i + 1).join(':')}' (From '${loadedComponents[ns].path}')`);
		}
		section = nextSection;
	}
	
	const definition = section.querySelector(`cdefn[ctype="${type}"]`);
	if (definition === null)
	{
		throw ReferenceError(`Unrecognized definition '${ctype.join(':')}' (From '${loadedComponents[ns].path}')`);
	}
	return definition.cloneNode(true);
}

function getStyleClass(stype)
{
	const styleClass = {};
	stype = stype.split(':');
	const ns = stype[0];
	const type = stype[1];
	
	if (loadedComponents[ns] == null)
	{
		throw ReferenceError(`Unrecognized namespace '${stype[0].trim()}' (From '${stype.join(':')}')`);
	}
	const definition = loadedComponents[ns].document.querySelector(`styleclass[stype="${type}"]`);
	if (definition == null)
	{
		throw ReferenceError(`Unrecognized style class '${stype.join(':')}' (From '${loadedComponents[ns].path}')`);
	}
	
	for (const styleAttr of definition.attributes.style.value.split(';').filter(e=>e))
	{
		const split = styleAttr.split(':').filter(e=>e);
		styleClass[split[0].trim()] = split[1].trim();
	};
	return styleClass;
}