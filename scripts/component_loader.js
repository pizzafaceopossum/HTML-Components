
	// Loaded components: components that are available to use after being located on the file system.
const loadedComponents = {};
	// Style classes: Sort of like regular CSS classes except they are specifically only able to use inline style attributes.
	// Also, they are set up to be exported into the style attribute when exporting.
const styleClasses = {};

	// XML attributes that are ignored when using inheritance.
const ignoredAttributes = ['ctype', 'climit', 'style'];


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
		console.log('split', split);
		styleClass[split[0].trim()] = split[1].trim();
	};
	return styleClass;
}

	// Applies attribute inheritance to inheritors
	// If the inheritor defines that attribute, it will not be overwritten
	// Style is unique, it has style attributes which are themselves separately inherited
	// E.g., <cInherit style="background-color;position;color" onclick=""><span style="position:relative;">span</span><span>span</span></cInherit>
function applyAttributeInheritance(inheritors, attributes, styleAttributes)
{
	if (inheritors.length > 0)
	{
		for (const elem of inheritors)
		{
			const attributesToInherit = [...elem.attributes.all ? attributes : elem.attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase()));
			const styleToInherit = (elem.attributes.all && elem.attributes.style == null) || (elem.attributes.style && /all/.test(elem.attributes.style.value)) ? Object.keys(styleAttributes) : elem.attributes.style.value.split(';').map(e=>e.trim()).filter(e=>Object.keys(styleAttributes).includes(e)&&e.length > 0);

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
							for (styleAttribute of styleToInherit.filter(e => !Object.keys(childStyleAttributes).includes(e)).filter(e=>e.length > 0))
							{
								childStyleAttributes[styleAttribute] = styleAttributes[styleAttribute];
							}
							child.setAttribute('style', Object.entries(childStyleAttributes).map(e=>e.join(':')).join(';'));
						}
						else
						{
							child.setAttribute('style', Object.entries(styleAttributes).map(e=>e.join(':')).join(';'));
						}
						// console.log('resulting childStyleAttributes', {...childStyleAttributes});
					}
				}
			}
			elem.outerHTML = elem.getHTML();
		}
	}
}

function applyStyleClasses(elements)
{
	console.log('elements', elements);
	for (const element of elements)
	{
		console.log(element.attributes['style-class'].value);
		const styleClasses = element.attributes['style-class'].value.split(',').filter(e=>e).map(e=>getStyleClass(e));
		console.log('classes', styleClasses);
		const styleAttributes = {};
		
		if (element.attributes.style)
		{
			const childStyleAttributes = {};
			for (const attr of [...element.attributes.style.value.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups))
			{
				childStyleAttributes[attr.name] = attr.value;
			}
			for (const styleClass of styleClasses)
			{
				Object.assign(styleAttributes, styleClass);
			}
			Object.assign(styleAttributes, childStyleAttributes);
		}
		element.setAttribute('style', Object.entries(styleAttributes).map(e=>e.join(':')).join(';'));
		element.removeAttribute('style-class');
	}
	
}

function applyComponent(component)
{
		// Copy the inner HTML for this instance of the component as the 'child', as well as attributes
	const innerHTML = component.getHTML();
	const attributes = component.attributes;
	const styleAttributes = {};
	if (attributes.style)
	{
		for (const attr of [...attributes.style.value.matchAll(/(?<name>[a-zA-Z_\-0-9]+)\s*:\s*(?<value>[^:;]+)/g)].map(e=>e.groups))
		{
			styleAttributes[attr.name] = attr.value;
		}
	}

		// Get a duplicate of the component to edit into the instance
	const loadedComponent = copyLoadedComponent(component.attributes.ctype.nodeValue);
	applyComponents(loadedComponent);
		// Locate any attribute inheritors in the component
	applyAttributeInheritance(loadedComponent.querySelectorAll('cInherit'), component.attributes, styleAttributes);
	applyStyleClasses(loadedComponent.querySelectorAll('[style-class]'));

		// Look for '<children></children>' in the component file
	const childPlacement = loadedComponent.querySelector('cChildren');

		// If the component HTML says where to place the child HTML, place it there
	if (childPlacement)
	{
		childPlacement.outerHTML = innerHTML;
		component.outerHTML = loadedComponent.getHTML().trim();
	}
	else	// Place it at the end, otherwise
	{
		component.outerHTML = loadedComponent.getHTML().trim() + innerHTML;
	}
}

	// Replace any components that are children of 'element' with the HTML that they stand for.
function applyComponents(element)
{
	if (element.childElementCount > 0)
	{
			// If there are any element children, recursively call this function, so that components are replaced 'depth-first'.
			// This must be called for all element types, otherwise '<component><div><component>...</component></div></component>' would not work.
		for (const child of element.children)
		{
			applyComponents(child);
		}
	}
		// If this element is a component, then execute the replacement function.
	if (element.tagName.toLowerCase() == 'component')
	{
		applyComponent(element);
	}
}

fetch(window.location.origin + '/components/')
.then(fetchComponentList)
.then(() => {applyComponents(display)});
