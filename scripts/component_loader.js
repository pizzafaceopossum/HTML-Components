	// Fetches a file and returns an HTMLDocument after parsing the contents.
async function fetchComponent(value)
{
	return (new DOMParser()).parseFromString(await value.text(), 'text/html');
}

	// Fetches all files from the 'components' folder (with recursion, ignores hidden files) and adds them to the components object
	// See README for details
async function fetchComponentList(value)
{
		// Parses the response from the server as HTML.
	const parsedResponse = (new DOMParser()).parseFromString(await value.text(), 'text/html');
		// Locates 'a' elements with 'icon-html' class (for use with npm live-server)
	const htmlAnchors = [...parsedResponse.querySelectorAll('a.icon-html')];
		// Locates 'a' elements with 'icon-directory' class and filters out hidden folders and the 'go back' folder.
	const directoryAnchors = [...parsedResponse.querySelectorAll('a.icon-directory')]
		.filter(anchor => anchor.title[0] != '.' );
	
	for (const anchor of directoryAnchors)
	{
			// If a directory is found, recursively call this same function.
		await fetch(anchor.href).then(fetchComponentList);
	}
	for (const anchor of htmlAnchors)
	{
			// If an html is found, parse it and add it to the list. Raise an error if there are multiple with the same name, and say where they're at.
		const name = anchor.title.replaceAll(/\..*/g, '').toLowerCase();
		const path = anchor.pathname.replace(/\/components/, '~');
		if (loadedComponents[name] != null)
		{
			throw SyntaxError(`duplicate namespace (use a different file name) '${name}' (From '${path}' and '${loadedComponents[name].path}')`);
		}
			// Add it to the list as an HTML document (so DOM code can be used on it)
		const doc = await fetch(anchor.href).then(fetchComponent);
		loadedComponents[name] = {path: path, document: doc, references: {}};
		const duplicates = {ctype: {}, stype: {}};
		const internalReferences = {};
		for (const child of doc.documentElement.querySelector('body').children)
		{
			switch (child.tagName.toLowerCase())
			{
				case 'styleclass':
					//console.log(styleClass);
					if (!child.attributes.stype || !child.attributes.stype.value)
					{
						throw SyntaxError(`Undefined or empty stype in namespace '${name}' (From '${loadedComponents[name].path}')`);
					}
					else if (duplicates.stype[child.attributes.stype.value])
					{
						throw SyntaxError(`Duplicate styleclass '${child.attributes.stype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
					}
					duplicates.stype[child.attributes.stype.value] = true;
					child.stype = `${name}::${child.stype}`;
					break;
				case 'cdefn':
					//console.log(definition);
					if (!child.attributes.ctype || !child.attributes.ctype.value)
					{
						throw SyntaxError(`Undefined or empty ctype in namespace '${name}' (From '${loadedComponents[name].path}')`);
					}
					else if (duplicates.ctype[child.attributes.ctype.value] == true)
					{
						throw SyntaxError(`Duplicate definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
					}
					else if (child.querySelector('cdefn'))
					{
						throw SyntaxError(`Definition within definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
					}
					else if (child.querySelector('styleclass'))
					{
						throw SyntaxError(`Style class within definition '${child.attributes.ctype.value}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
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
					break;
				default:
					throw SyntaxError(`Unknown tag '${child.tagName}' in namespace '${name}' (From '${loadedComponents[name].path}')`);
					break;
			}
			
		}
		loadedComponents[name].references = internalReferences;
		for (const element of doc.querySelectorAll(`[style-class]`))
		{
			element.attributes['style-class'].value = element.attributes['style-class'].value
			.split(',')
			.map(e => `${name}::${e.trim().toLowerCase()}`)
			.join(',');
		}
	}
}
/*
const ob = {
	a: {b: true},
	b: {c: true},
	c: {a: true},
}

const arr = [];
const N = 3;
for (let i = 0; i < N; i++)
{
	const arr_ = [];
	for (let j = 0; j < N; j++)
	{
		arr_.push(j == (i + 1) ? 1 : 0);
	}
	arr.push(arr_);
}
console.log([...arr]);
*/
/*
console.log(checkCircularReferences1([...arr].map(e => [...e])));
console.log(checkCircularReferences2([...arr].map(e => [...e])));
*/
//console.log(checkCircularReferences3([...arr].map(e => [...e])));
//console.log(checkCircularReferences3(ob));


	// Checks for circular references by repeatedly adding information to parent nodes about which nodes they can reach
	// After this is done, if any node can reach itself, that is a circular reference
/*
function checkCircularReferences1(object)
{
	console.log('object', {...object});
	const time = performance.now();
	let asString = '';
	let loops = 0;
	while (asString != JSON.stringify(object))
	{
		asString = JSON.stringify(object);
		loops += 1;
		//console.log('loop ', loops);
		for (const def in object)
		{
			//console.log('definition', def);
			for (const parent of Object.keys(object).filter(e => Object.keys(object[e]).includes(def) && object[e][def]))
			{
				//console.log('notifying parent', parent);
				for (const ref in object[def])
				{
					if (object[def][ref])
					{
						object[parent][ref] = object[def][ref];
					}
				}
			}
		}
	}
	let result = true;
	for (const def in object)
	{
		if (object[def][def] != null)
		{
			result = false;
			break;
		}
	}
	console.log('circularReferences1: loops', loops, 'time:', performance.now() - time);
	return result;
}
*/
	// Checks for circular references by deleting leaves
	// If the object is nonempty after deleting all the leaves, then there must be a circular reference
function checkCircularReferences2(object)
{
	//console.log({...object});
	const time = performance.now();
	let asString = '';
	let loops = 0;
	for (const def in object)
	{
		for (const irrelevantKey of Object.keys(object[def]).filter(e => !(Object.keys(object).includes(e))))
		{
			delete object[def][irrelevantKey];
		}
	}
	while (asString != JSON.stringify(object))
	{
		loops += 1;
		asString = JSON.stringify(object);
		for (const def in object)
		{
			if (Object.keys(object[def]).filter(e => object[def][e]).length == 0)
			{
				//console.log(def, 'had no references');
				for (const parent of Object.keys(object).filter(e => Object.keys(object[e]).includes(def)))
				{
					//console.log('informing', parent);
					delete object[parent][def];
				}
				delete object[def];
			}
		}
	}
	//console.log('circularReferences2: loops:', loops, "time:", performance.now() - time);
	return Object.keys(object).length == 0;
}

/*
	// Take the idea from circularReferences1 but use square matrices whose side length is the length of the number of keys
function checkCircularReferences3(object)
{
	console.log('object', {...object});
	const time = performance.now();
	const entries = Object.entries(object);
	const array = [];
	for (let i = 0; i < entries.length; ++i)
	{
		array.push([]);
		for (let j = 0; j < entries.length; ++j)
		{
			array[i].push(entries[i][1][entries[j][0]] ? 1 : 0);
		}
	}
	
	let changed = true;
	while (changed)
	{
		changed = false;
		for (const idx in 
	}
		
	console.log('array', array);
	console.log('row b', array[1]);
	console.log('column b', array.map(e => e[1]));
}
*/

async function checkLoadedComponents()
{
	// Check for circular references between namespaces
	const object = {};
	for (const ns in loadedComponents)
	{
		for (const ctype in loadedComponents[ns].references)
		{
			object[ctype] = {...loadedComponents[ns].references[ctype]}
		}
	}
	if (!checkCircularReferences2(object))
	{
		const namespaces = {};
		for (const nonempty of Object.keys(object).filter(e=>Object.keys(object[e]).length > 0))
		{
			const split = nonempty.split('::');
			namespaces[split[0]] = namespaces[split[0]] ? namespaces[split[0]] : []
			namespaces[split[0]].push(split[1]);
			console.log(namespaces);
		}
		let string = '';
		for (const ns in namespaces)
		{
			string += ` '${namespaces[ns].join("','")}' (From '${loadedComponents[ns].path}'),`;
		}
		string = string.substring(0, string.length - 1);
		throw SyntaxError(`Circular reference(s) found involving components${string}`)
	}
}

fetch(window.location.origin + '/components/')
.then(fetchComponentList)
.then(checkLoadedComponents)
.then(() => {applyComponents(display)});
