/*
 *	Component Application
 *	Order of operations:
 *	1. Place Child Elements
 *	2. Apply Attribute Inheritance
 *	4. Apply Style Classes
 *	3. Apply Child Components
 */

	// Applies attribute inheritance to inheritors
	// If the inheritor defines that attribute, it will not be overwritten
	// Style is unique, it has style attributes which are themselves separately inherited
	// E.g., <cInherit style="background-color;position;color" onclick=""><span style="position:relative;">span</span><span>span</span></cInherit>
function applyAttributeInheritance(elem, attributes, styleAttributes)
{
	/*
	console.log('inherit element', elem);
	console.log('component attributes', attributes);
	console.log('component style attributes', styleAttributes);
	*/
		// Don't even bother to do anything if the inheritor doesn't say to inherit any attributes or the component has none set or the inheritor has no contained elements
	if (elem.childElementCount > 0 && [...elem.attributes].length > 0 && [...attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase())).length + Object.keys(styleAttributes).length > 0)
	{
			// Inherit attributes: If the 'all' attribute is set, just do them all, otherwise only do the ones that are set
		let attributesToInherit = [...elem.attributes.all ? attributes : elem.attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase()));
			// Inherit style attributes: Start by taking the defined style attributes
		let styleToInherit = Object.keys(styleAttributes);

			// Then filter by which the inheritor says to inherit, if any
		if (elem.attributes.style)
		{
			styleToInherit = /all/.test(elem.attributes.style.value) ? styleToInherit : styleToInherit.filter(e => RegExp(e).test(elem.attributes.style.value));
		}
		else
		{
			styleToInherit = elem.attributes.all ? styleToInherit : [];
		}
		//console.log('elem', elem, 'given attributes', attributes, 'given style', styleAttributes, 'toInherit', attributesToInherit, 'styleToInherit', styleToInherit);
		for (const child of elem.children)
		{
				// Attributes overwrite those already set, when they exist on the parent instance
			for (attribute of attributesToInherit)
			{
				child.attributes.setNamedItem(attribute.cloneNode(true));
			}
			
			if (styleToInherit.length > 0)
			{
					// Get child's current style
				const childStyleAttributes = {};
				if (child.attributes.style)
				{
					for (const attr of getStyleFromString(child.attributes.style.value))
					{
						childStyleAttributes[attr.name] = attr.value;
					}
				}
					// Overwrite/add the inherited style
				for (const attr of styleToInherit)
				{
					childStyleAttributes[attr] = styleAttributes[attr];
				}
					// Set the child's style attribute
				child.setAttribute('style', styleStringFromObject(childStyleAttributes));
			}
		}
	}
	elem.outerHTML = elem.getHTML().trim();
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
	const componentDef = copyLoadedComponent(component.attributes.ctype.nodeValue);
		// Look for '<cchildren></cchildren>' in the component file
	const childPlacement = componentDef.querySelector('cChildren');
		// If the component HTML says where to place the child HTML, place it there
	if (childPlacement)
	{
		childPlacement.outerHTML = innerHTML;
	}
	else	// Place it at the end, otherwise
	{
		componentDef.innerHTML += innerHTML;
	}
	
		// Locate any attribute inheritors in the component
	let inheritor = componentDef.querySelector('cInherit');
	
		// While there are inheritors, apply the inheritance to them
	while (inheritor != null)
	{
		applyAttributeInheritance(inheritor, component.attributes, styleAttributes);
		inheritor = componentDef.querySelector('cInherit');
	}
	
		// Apply style classes to any elements that have them
	applyStyleClasses(componentDef.querySelectorAll('[style-class]'));
	
		// Then, recursively apply components to child components
	for (const child of componentDef.children)
	{
		applyComponents(child);
	}
	
		// Finally, remove the component's tag from the document
	component.outerHTML = componentDef.getHTML().trim();
}

	// Replace any components that are children of 'element' with the HTML that they stand for.
function applyComponents(element)
{
	if (element.tagName.toLowerCase() == 'component')
	{
		applyComponent(element);
	}
	else
	{
			// If there are any element children, recursively call this function, so that components are replaced 'depth-first'.
			// This must be called for all element types, otherwise '<component><div><component>...</component></div></component>' would not work.
		for (const child of element.children)
		{
			applyComponents(child);
		}
	}
}