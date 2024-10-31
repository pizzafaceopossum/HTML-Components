	// Applies attribute inheritance to inheritors
	// If the inheritor defines that attribute, it will not be overwritten
	// Style is unique, it has style attributes which are themselves separately inherited
	// E.g., <cInherit style="background-color;position;color" onclick=""><span style="position:relative;">span</span><span>span</span></cInherit>
function applyAttributeInheritance(elem, attributes, styleAttributes)
{
	const attributesToInherit = [...elem.attributes.all ? attributes : elem.attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase()));
	const styleToInherit = (elem.attributes.all && elem.attributes.style == null) || (elem.attributes.style && /all/.test(elem.attributes.style.value)) ? Object.keys(styleAttributes) : elem.attributes.style.value.split(';').map(e=>e.trim()).filter(e=>Object.keys(styleAttributes).includes(e)&&e.length > 0);

	console.log('elem', elem, 'given attributes', attributes, 'given style', styleAttributes, 'toInherit', attributesToInherit, 'styleToInherit', styleToInherit);
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
				const childStyleAttributes = {};
				for (styleAttribute of styleToInherit.filter(e => !Object.keys(childStyleAttributes).includes(e)).filter(e=>e.length > 0))
				{
					childStyleAttributes[styleAttribute] = styleAttributes[styleAttribute];
				}
				if (child.attributes.style)
				{
					for (const attr of getStyleFromString(child.attributes.style.value))
					{
						childStyleAttributes[attr.name] = attr.value;
					}
				}
				child.setAttribute('style', styleStringFromObject(childStyleAttributes));
			}
		}
	}
	elem.outerHTML = elem.getHTML();
}

function applyStyleClasses(elements)
{
	for (const element of elements)
	{
		const styleClasses = element.attributes['style-class'].value.split(',').filter(e=>e).map(e=>getStyleClass(e));
		const styleAttributes = {};
		
		if (element.attributes.style)
		{
			const childStyleAttributes = {};
			for (const attr of getStyleFromString(element.attributes.style.value))
			{
				childStyleAttributes[attr.name] = attr.value;
			}
			for (const styleClass of styleClasses)
			{
				Object.assign(styleAttributes, styleClass);
			}
			Object.assign(styleAttributes, childStyleAttributes);
		}
		else
		{
			for (const styleClass of styleClasses)
			{
				Object.assign(styleAttributes, styleClass);
			}
		}
		element.setAttribute('style', styleStringFromObject(styleAttributes));
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
	console.log(loadedComponent);
	applyComponents(loadedComponent);
	let inheritor = loadedComponent.querySelector('cInherit');
		// Locate any attribute inheritors in the component
	while (inheritor != null)
	{
		console.log('inheritor', inheritor);
		applyAttributeInheritance(inheritor, component.attributes, styleAttributes);
		inheritor = loadedComponent.querySelector('cInherit');
	}
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
	switch (element.tagName.toLowerCase())
	{
		case 'component':
			applyComponent(element);
			break;
		//case 'cinherit':
		//	applyAttributeInheritance(element);
		//	break;
	}
}