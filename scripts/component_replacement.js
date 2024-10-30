async function applyComponentsToHTML(value)
{
	const components = document.querySelectorAll('component');
	console.log(components);
	for (const component of components)
	{
		component.outerHTML = loadedComponents[component.attributes['ctype'].nodeValue].documentElement.innerHTML.trim();
	}
}