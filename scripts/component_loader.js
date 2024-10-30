const loadedComponents = {};

async function fetchComponent(value)	// Fetches the file and returns a parsed XMLDocument
{
	return (new DOMParser()).parseFromString(await value.text(), 'text/xml')
}

async function fetchComponentList(value)	// Fetches all files from the live-server folder and adds them to the components object
{
	const parsedResponse = (new DOMParser()).parseFromString(await value.text(), 'text/html');
	const xmlAnchors = [...parsedResponse.querySelectorAll('a')]
		.filter(anchor => anchor.title.substring(anchor.title.length - 4).toLowerCase() == '.xml');
	for (const anchor of xmlAnchors)
	{
		loadedComponents[anchor.title.substring(0, anchor.title.length - 4).toLowerCase()] = await fetch(anchor.href).then(fetchComponent);
	}
	console.log(loadedComponents);
}

async function applyComponentsToHTML(value)
{
	const components = document.querySelectorAll('component');
	console.log(components);
	for (const component of components)
	{
		component.outerHTML = loadedComponents[component.attributes['ctype'].nodeValue].documentElement.innerHTML.trim();
	}
}

fetch(window.location + 'codes/')
.then(fetchComponentList)
.then(applyComponentsToHTML);
