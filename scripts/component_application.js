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

	// Function for application of a single component
function applyComponent(component)
{
		// Get a duplicate of the definition to edit into the instance
	const componentDef = copyLoadedComponent(component.attributes.ctype.nodeValue);
	
		// Place element children from the document
	applyChildPlacement(component, componentDef);
	
		// Apply attribute inheritance
	applyAttributeInheritance(component, componentDef);
	
		// Apply style classes
	applyStyleClasses(componentDef);
	
		// Then, recursively apply components to child elements
	for (const child of componentDef.children)
	{
		applyComponents(child);
	}
	
		// Finally, remove the component's tag from the document
	component.outerHTML = componentDef.getHTML().trim();
}


	// Places child nodes of component into the indicated placements in the component definition
	// Use selectors in the definition for more options
	// If there are any <cChildren></cChildren> elements in the definition, the first one that matches a selector is used
	// Otherwise, the first one is used
	// Otherwise, children are placed at the end.
function applyChildPlacement(component, componentDef)
{
	const innerHTML = component.getHTML();
		// Look for '<cchildren></cchildren>' in the component file
	const childPlacement = componentDef.querySelector('cChildren');
	
	
		// Find all indicators, but make sure those that specify selectors go first
	const indicators = [...componentDef.querySelectorAll('cChildren[selector]'), ...componentDef.querySelectorAll('cChildren:not([selector])')];
	
	for (const indicator of indicators)
	{
		for (const child of [...component.childNodes])
		{
				// Could be done with filter, but I don't like that
			if ( (indicator.attributes.selector && [...component.querySelectorAll(indicator.attributes.selector.value)].includes(child)) || indicator.attributes.selector == null)
			{
				indicator.appendChild(child);
			}
		}
			// Remove the indicator tag once finished
		indicator.outerHTML = indicator.getHTML();
	}
	
	for (const child of [...component.childNodes])
	{
		componentDef.appendChild(child);
	}
}

	// Applies attribute inheritance to inheritors
	// If the inheritor defines that attribute, it will not be overwritten
	// Style is unique, it has style attributes which are themselves separately inherited
	// E.g., <cInherit style="background-color;position;color" onclick=""><span style="position:relative;">span</span><span>span</span></cInherit>
function applyAttributeInheritance(component, componentDef)
{		// Copy the inner HTML for this instance of the component as the 'child', as well as attributes
	const styleAttributes = {};
	
	if (component.attributes.style)
	{
		for (const attr of getStyleFromString(component.attributes.style.value))
		{
			styleAttributes[attr.name] = attr.value;
		}
	}
		// Locate any attribute inheritors in the component
	let inheritor = componentDef.querySelector('cInherit');
	
	while (inheritor != null)
	{
			// Inherit attributes: Start with all of the attributes
		let attributesToInherit = [...component.attributes].filter(attr => !ignoredAttributes.includes(attr.name.toLowerCase()));
		
			// Inherit style attributes: Start by taking the defined style attributes
		let styleToInherit = Object.keys(styleAttributes);
		
			// Don't even bother to do anything if the inheritor doesn't say to inherit any attributes or the component has none set or the inheritor has no contained elements
		if (inheritor.childElementCount > 0 && [...inheritor.attributes].length > 0 && attributesToInherit.length + styleToInherit.length > 0)
		{
				// Then if the 'all' attribute is set, just do them all, otherwise only do the ones that are set
			if (inheritor.attributes.all == null)
			{
				attributesToInherit = attributesToInherit.filter(attr => [...inheritor.attributes].map(e => e.name).includes(attr));
			}
			
				// Then filter by which the inheritor says to inherit, if any
			if (inheritor.attributes.style)
			{
				styleToInherit = /all/.test(inheritor.attributes.style.value) ? styleToInherit : styleToInherit.filter(e => RegExp(e).test(inheritor.attributes.style.value));
			}
			else
			{
				styleToInherit = inheritor.attributes.all ? styleToInherit : [];
			}
			//console.log('inheritor', inheritor, 'given attributes', attributes, 'given style', styleAttributes, 'toInherit', attributesToInherit, 'styleToInherit', styleToInherit);
			for (const child of inheritor.children)
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
		inheritor.outerHTML = inheritor.getHTML().trim();
		inheritor = componentDef.querySelector('cInherit');
	}
}

function applyStyleClasses(componentDef)
{
	for (const element of componentDef.querySelectorAll('[style-class]'))
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
