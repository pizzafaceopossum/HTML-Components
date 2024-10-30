const loadedComponents = {};
const styleClasses = {};

const ignoredAttributes = ['ctype', 'climit', 'style'];

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
	//console.log(loadedComponents);
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

function applyComponents(element)
{
	if (element.childElementCount > 0)
	{
		for (const child of element.children)
		{
			applyComponents(child);
		}
	}
	if (element.tagName.toLowerCase() == 'component')
	{
			// Copy the written inner HTML as the 'child'
		const innerHTML = element.innerHTML;
		const attributes = element.attributes;
		const styleAttributes = {};
		if (attributes.style)
		{
			for (const attr of [...attributes.style.value.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups))
			{
				styleAttributes[attr.name] = attr.value;
			}
		}

			// Component innerHTML stored in the file
		const loadedComponent = loadedComponents[element.attributes['ctype'].nodeValue].documentElement.cloneNode(true);
		const attributeInheritors = loadedComponent.querySelectorAll('cInherit');
		//console.log(attributeInheritors);
		if (attributeInheritors.length > 0)
		{
			for (const elem of attributeInheritors)
			{
				const attributesToInherit = [...elem.attributes.all ? element.attributes : elem.attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase()));
				const styleToInherit = (elem.attributes.all && elem.attributes.style == null) || (elem.attributes.style && /all/.test(elem.attributes.style.value)) ? Object.keys(styleAttributes) : elem.attributes.style.value.split(';').map(e=>e.trim()).filter(e=>Object.keys(styleAttributes).includes(e)&&e.length > 0);
				//console.log('attributesToInherit', attributesToInherit);
				console.log('styleToInherit', [...styleToInherit]);
				console.log('styleAttributes', {...styleAttributes});

				if (elem.childElementCount > 0)
				{
					for (const child of elem.children)
					{
							// Defining attributes on the child elements in the component overwrites this behavior
							// So attributes can operate on a whitelist by wrapping child elements and setting the attributes,
							// Or a blacklist by wrapping the entire component's contents and setting to 'all', and just setting individual attributes.
							// Or a mix of both as fitting.


						for (attribute of attributesToInherit.filter(attr => child.attributes[attr.name] == null))
						{
							child.attributes.setNamedItem(attribute.cloneNode(true));
						}

						if (styleToInherit.length > 0)
						{
							if (child.attributes.style)
							{
								const childStyleAttributes = {};
								for (const attr of [...child.attributes.style.value.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups))
								{
									childStyleAttributes[attr.name] = attr.value;
								}
								console.log('childStyleAttributes', {...childStyleAttributes});
								console.log('styleToInherit filtered for', child, [...styleToInherit.filter(e => !Object.keys(childStyleAttributes).includes(e)).filter(e=>e.length > 0)]);
								for (styleAttribute of styleToInherit.filter(e => !Object.keys(childStyleAttributes).includes(e)).filter(e=>e.length > 0))
								{
									childStyleAttributes[styleAttribute] = styleAttributes[styleAttribute];
								}
								child.setAttribute('style', Object.entries(childStyleAttributes).map(e=>e.join(':')).join(';'));
							}
							else
							{
								child.setAttribute('style', Object.entries(styleAttributes).map(e=>e.join(':')).join(';'));
								console.log(child);
							}
							// console.log('resulting childStyleAttributes', {...childStyleAttributes});
						}
					}
				}
				elem.outerHTML = elem.innerHTML;
			}
		}

			// Look for '<children></children>' in the component file
		const childPlacement = loadedComponent.querySelector('cChildren')

			// If the component HTML says where to place the child HTML, place it there
		if (childPlacement)
		{
			childPlacement.outerHTML = innerHTML;
			element.outerHTML = loadedComponent.innerHTML.trim();
		}
		else	// Place it at the end, otherwise
		{
			element.outerHTML = loadedComponent.innerHTML.trim() + innerHTML;
		}
	}
}

fetch(window.location + 'components/')
.then(fetchComponentList)
.then(() => {applyComponents(display)});
