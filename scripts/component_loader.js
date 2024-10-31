	// Fetches a file and returns an XMLDocument after parsing the contents.
async function fetchComponent(value)
{
	return (new DOMParser()).parseFromString(await value.text(), 'text/xml')
}

	// Fetches all files from the 'components' folder (with recursion, ignores hidden files) and adds them to the components object
	// See README for details
async function fetchComponentList(value)
{
		// Parses the response from the server as HTML.
	const parsedResponse = (new DOMParser()).parseFromString(await value.text(), 'text/html');
		// Locates 'a' elements with 'icon-xml' class (for use with npm live-server)
	const xmlAnchors = [...parsedResponse.querySelectorAll('a.icon-xml')];
		// Locates 'a' elements with 'icon-directory' class and filters out hidden folders and the 'go back' folder.
	const directoryAnchors = [...parsedResponse.querySelectorAll('a.icon-directory')]
		.filter(anchor => anchor.title[0] != '.' );
	
	for (const anchor of directoryAnchors)
	{
			// If a directory is found, recursively call this same function.
		await fetch(anchor.href).then(fetchComponentList);
	}
	for (const anchor of xmlAnchors)
	{
			// If an xml is found, parse it and add it to the list. Raise an error if there are multiple with the same name, and say where they're at.
		const name = anchor.title.substring(0, anchor.title.length - 4).toLowerCase();
		if (loadedComponents[name] != null)
		{
			throw SyntaxError(`duplicate namespace (use a different file name) '${name}' (From '${anchor.pathname.replace(/\/components/, '~')}' and '${loadedComponents[name].path}')`);
		}
			// Add it to the list as an XML document (so DOM code can be used on it)
		const doc = await fetch(anchor.href).then(fetchComponent);
		loadedComponents[name] = {path: anchor.pathname.replace(/\/components/, '~'), document: doc};
		const duplicates = {ctype: {}, stype: {}};
		
		for (const styleClass of doc.querySelectorAll('styleclass'))
		{
			//console.log(styleClass);
			if (!styleClass.attributes.stype || !styleClass.attributes.stype.value)
			{
				throw SyntaxError(`Undefined or empty stype in namespace '${name}' (From '${loadedComponents[name].path}')`);
			}
			else if (duplicates.stype[styleClass.attributes.stype.value])
			{
				throw SyntaxError(`Duplicate styleclass '${styleClass.attributes.stype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
			}
			duplicates.stype[styleClass.attributes.stype.value] = true;
			styleClass.stype = `${name}::${styleClass.stype}`;
		}
		for (const definition of doc.querySelectorAll('cdefn'))
		{
			//console.log(definition);
			if (!definition.attributes.ctype || !definition.attributes.ctype.value)
			{
				throw SyntaxError(`Undefined or empty ctype in namespace '${name}' (From '${loadedComponents[name].path}')`);
			}
			else if (duplicates.ctype[definition.attributes.ctype.value] == true)
			{
				throw SyntaxError(`Duplicate cdefn '${definition.attributes.ctype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
			}
			duplicates.ctype[definition.attributes.ctype.value] = true;
			for (const componentChild of definition.querySelectorAll('component'))
			{
				componentChild.attributes.ctype.value = `${name}::${componentChild.attributes.ctype.value}`;
			}
		}
		for (const elementWithStyleClass of doc.querySelectorAll(`[style-class]`))
		{
			elementWithStyleClass.attributes['style-class'].value = elementWithStyleClass.attributes['style-class'].value
			.split(',')
			.map(e => `${name}::${e.trim().toLowerCase()}`)
			.join(',');
		}
	}
}

fetch(window.location.origin + '/components/')
.then(fetchComponentList)
.then(() => {applyComponents(display)});
