
function loadSection(element, duplicates, internalReferences, name, path)
{
	if (element.tagName.toLowerCase() == 'csection')
	{
		name += element.attributes.ctype.value + ':';
	}
	for (const child of element.children)
	{
		switch (child.tagName.toLowerCase())
		{
			case 'csection':
				loadSection(child, duplicates, internalReferences, name, path);
				break;
			case 'styleclass':
				loadStyleClass(child, duplicates, name, path);
				break;
			case 'cdefn':
				loadDefinition(child, duplicates, internalReferences, name, path);
				break;
			default:
				throw SyntaxError(`Unknown tag '${child.tagName}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
				break;
		}
	}
}


function loadStyleClass(child, duplicates, name, path)
{
	if (!child.attributes.stype || !child.attributes.stype.value)
	{
		throw SyntaxError(`Undefined or empty stype in namespace '${name}' (From '${path}')`);
	}
	else if (duplicates.stype[child.attributes.stype.value])
	{
		throw SyntaxError(`Duplicate styleclass '${child.attributes.stype.value}' in namespace '${name}' (From '${path}')`);
	}
	duplicates.stype[child.attributes.stype.value] = true;
	child.stype = `${name}::${child.stype}`;
}

function loadDefinition(child, duplicates, internalReferences, name, path)
{
	if (!child.attributes.ctype || !child.attributes.ctype.value)
	{
		throw SyntaxError(`Undefined or empty ctype in namespace '${name}' (From '${path}')`);
	}
	else if (duplicates.ctype[child.attributes.ctype.value] == true)
	{
		throw SyntaxError(`Duplicate definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${path}')`);
	}
	else if (child.querySelector('cdefn'))
	{
		throw SyntaxError(`Definition within definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${path}')`);
	}
	else if (child.querySelector('styleclass'))
	{
		throw SyntaxError(`Style class within definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${path}')`);
	}
	duplicates.ctype[child.attributes.ctype.value] = true;
	internalReferences[`${name}::${child.attributes.ctype.value}`] = {};
	for (const componentChild of child.querySelectorAll('component'))
	{
		if (!/::/.test(componentChild.attributes.ctype.value))
		{
			componentChild.attributes.ctype.value = `${name}::${componentChild.attributes.ctype.value}`;
		}
		internalReferences[`${name}::${child.attributes.ctype.value}`][componentChild.attributes.ctype.value] = true;
	}
}