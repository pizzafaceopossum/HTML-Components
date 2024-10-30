
// Tags that do not require an ending tag in HTML
const voidTagTypes = [
	'area',
	'base',
	'br',
	'col',
	'command',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]

// Tags that are okay to print on a single line, usually
const inlineTagTypes = [
	'span',	//span
	'p',	// paragraph
	'li',	// list item
	'b',	// bold text
	'i',	// italics
	'u',	// underlined
	's',	// strikethrough
	'cite',	// citation
	'abbr',	// abbreviation
	'dfn',	// definition
]

const rawTextTypes = [null, 'rawText', 'whitespace'];

function isRawText(type) {return rawTextTypes.includes(type)}
function isInlineTag(type) {return inlineTagTypes.includes(type)}
function isVoidTag(type) {return voidTagTypes.includes(type)}
function isLiteralTag(type) {return isInlineTag(type) || isVoidTag(type) || isRawText(type)}

function tokenize(input_string)
{
	//console.log('initial', input_string);
	const token_dictionary = {
		COMMENT: {regex: /<!--[\s\S]*?-->/g,},
		TAG_OPEN: {regex: /<[^/][^>]*?>/g,},
		TAG_CLOSE: {regex: /<\/[^>]+>/g,},
		STRING_LITERAL: {regex: /(?<value>'[^']*'|"[^"]*")/g,},
		WHITESPACE: {regex: /\s+/g,},
		OTHER: {regex: /\S/g,},
	}
	for (const token_expr in token_dictionary)
	{
		token_dictionary[token_expr].count = 0;
	}
	const tokens = [];

	let last_string_length = input_string.length;

	while (input_string.length > 0)
	{
		let longest;
		let match;
		for (const token_expr in token_dictionary)
		{
			const regex = token_dictionary[token_expr].regex;
			match = [...input_string.matchAll(regex)][0];
			if (match && match.index > 0)
			{
				continue;
			}
			if (match && (longest == null || longest.match[0].length < match[0].length))
			{
				longest = {type: token_expr, match: match};
			}
			if (match)
			{
				//console.log('match', token_expr, match);
			}
		}

		if (longest != null)
		{
			const type = longest.type;
			const text = longest.match[0];
			token_dictionary[type].count += 1;
			tokens.push({type: type, count: token_dictionary[type].count, text: text});
			input_string = input_string.substring(text.length);
			//console.log('longest match', longest.type, longest.match, ' next string: ', input_string);
		}
		else
		{
			console.error(TypeError, 'Invalid input! No matches.');
		}

		if (input_string.length == last_string_length)
		{
			console.error(TypeError, 'Invalid input! String length did not change.');
		}
		last_string_length = input_string.length;
	}

	tokens.push({type: 'EOF', count: 1, text: ''});
	//console.log(tokens.map(e=>e.text));
	return tokens;
}

function parseAttributes(attr)
{
	const attribute_strings = [...attr.matchAll(/(?<name>[a-zA-Z][a-zA-Z_\-]*)\s*=\s*(?:"(?<value>[^"]*?)"|'(?<value>[^']*?)')/g)];
	const attributes = [];
	let hasStyle = -1;
		// Assign the value to the attributes object with the key being the attribute name
	for (const attr of attribute_strings)
	{
		if (attr.groups.name.toLowerCase() == 'style') {hasStyle = attributes.length};
		attributes.push({name: attr.groups.name.toLowerCase(), value: attr.groups.value});
	}
		// If there is a style attribute then do the same kind of thing specifically to it
	if (hasStyle > -1)
	{
		const style_strings = [...attributes[hasStyle].value.matchAll(/(?<name>[a-zA-Z][a-zA-Z_\-]*)\s*:\s*?(?<value>.*?)\s*?(?:;|$)/g)];
		attributes[hasStyle].value = [];
		for (const style_attr of style_strings)
		{
			attributes[hasStyle].value.push({name: style_attr.groups.name.toLowerCase(), value: style_attr.groups.value});
		}
	}
	return attributes;
}

function parseAsXML(tokens)
{
	const elementArray = [];
	let nesting = {type: null, depth: 0};
	let priorToken;
	for (const token of tokens)
	{
		let tagData;
		let tagType;
		switch (token.type)
		{
			case 'TAG_OPEN':
				tagData = [...token.text.matchAll(/<\s*(?<type>\S+)\s*(?<attributes>.*?)\s*>/g)][0];
				tagType = tagData.groups.type;
				let tagAttr = tagData.groups.attributes;
				if (nesting.depth == 0)
				{
					elementArray.push({type: tagType, attributes: parseAttributes(tagAttr), outerHTML: token.text, innerHTML: [], children: [], canTrim: false});
					nesting.type = tagType;
				}
				else
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].innerHTML.push(token);
				}
				if (nesting.type == tagType) {nesting.depth += 1}
				break;
			case 'TAG_CLOSE':
				tagData = [...token.text.matchAll(/<\/\s*(?<type>\S+)\s*>/g)][0];
				tagType = tagData.groups.type;
				if (tagType == nesting.type)
				{
					nesting.depth -= 1;
				}
				if (nesting.depth == 0)
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].children = parseAsXML(elementArray[elementArray.length - 1].innerHTML);
					elementArray[elementArray.length - 1].innerHTML = elementArray[elementArray.length - 1].innerHTML.map(e=>e.text).join('');
				}
				else
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].innerHTML.push(token);
				}
				break;
			case 'COMMENT':
				if (elementArray.length > 0 && typeof(elementArray[elementArray.length - 1].innerHTML) != 'string' && nesting.depth > 0)
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].innerHTML.push(token);
				}
				else
				{
					elementArray.push({type: 'comment', attributes: {}, outerHTML: token.text, innerHTML: token.text.replaceAll(/(?:<!--|-->)/g, '').trim(), children: [], canTrim: true});
				}
				break;
			case 'WHITESPACE':
			case 'OTHER':
				if (elementArray.length > 0 && typeof(elementArray[elementArray.length - 1].innerHTML) != 'string' && nesting.depth > 0)
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].innerHTML.push(token);
				}
				else if (priorToken != null && priorToken.type == token.type)
				{
					elementArray[elementArray.length - 1].outerHTML += token.text;
					elementArray[elementArray.length - 1].innerHTML += token.text;
				}
				else
				{
					elementArray.push({type: token.type == 'OTHER' ? 'rawText' : 'whitespace', attributes: {}, outerHTML: token.text, innerHTML: token.text, children: [], canTrim: false});
				}
				break;
			case 'EOF':
				break;
			default:
				console.error(TypeError, 'Unknown token type');
		}
		priorToken = token;
	}

	for (let i = 0; i < elementArray.length; ++i)
	{
		if (!['whitespace', 'comment'].includes(elementArray[i].type))
		{
			break;
		}
		elementArray[i].canTrim = true;
	}
	for (let i = elementArray.length - 1; i >= 0; --i)
	{
		if (!['whitespace', 'comment'].includes(elementArray[i].type))
		{
			break;
		}
		elementArray[i].canTrim = true;
	}

	let i = 0;
	while (i < elementArray.length - 1)
	{
		if (
			elementArray[i + 1].canTrim == elementArray[i].canTrim &&
			['whitespace', 'rawText'].includes(elementArray[i].type) &&
			['whitespace', 'rawText'].includes(elementArray[i + 1].type)
		)
		{
			elementArray[i].outerHTML += elementArray[i + 1].outerHTML;
			elementArray[i].innerHTML += elementArray[i + 1].innerHTML;
			elementArray.splice(i + 1, 1);
		}
		else
		{
			i += 1;
		}
	}

	return elementArray;
}

function HTMLtoArray(html)
{
	const arr = parseAsXML(tokenize(html));
	return arr;
}

function stringifyStyleAttributes(attributeArray, trim)
{
	if (attributeArray.length == 0) {return '""'}
	let string = '';
	const assignment = trim ? ':' : ': ';
	const terminator = trim ? ';' : '; ';
	for (const attribute of attributeArray)
	{
		string += attribute.name + assignment + attribute.value + terminator;
	}
	return `"${string.trim()}"`;
}

function stringifyAttributes(attributeArray, trim)
{
	if (attributeArray.length == 0) {return ''}
	let string = ' ';
	const assignment = trim ? '=' : ' = ';
	const terminator = ' ';
	for (const attribute of attributeArray)
	{
		string += attribute.name + assignment + (attribute.name == 'style' ? stringifyStyleAttributes(attribute.value, trim) : JSON.stringify(attribute.value)) + terminator;
	}
	return string.substring(0, string.length-1);
}

function hasElementChildren(element)
{
	return element.children.filter(e=>!isRawText(e.type)).length > 0;
}

function attributeArrayToDict(attributes)
{
	const dict = {};
	for (const attr of attributes)
	{
		dict[attr.name] = attr.value;
	}
	return dict;
}

function ArraytoHTML(htmlArray, options = {}, depth = 0)
{
	let string = '';
	const trim = options.trim == true;
	const keepComments = options.keepComments == true;
	const inlineTags = options.inlineTags == true;
	const tabulator = Object.keys(options).includes('tabulator') ? options.tabulator : '\t';
	const linebreak = Object.keys(options).includes('linebreak') ? options.linebreak : '\n';
	let addWhiteSpace = true;
	for (const element of htmlArray)
	{
		const hasElementChild = hasElementChildren(element);
		if ( (!(element.type == 'comment') && element.canTrim && trim) || (element.type == 'comment' && !keepComments) )
		{
			continue;
		}
		else if (isRawText(element.type))
		{
			string += element.outerHTML;
		}
		else if (element.type == 'comment')
		{
			string += ( linebreak.repeat(depth > 0) + tabulator.repeat(depth) ).repeat(addWhiteSpace) + element.outerHTML;
		}
		else if ( (inlineTags || inlineTagTypes.includes(element.type)) && !hasElementChild )
		{
			string += ( linebreak.repeat(depth > 0) + tabulator.repeat(depth) ).repeat(addWhiteSpace) + `<${element.type}${stringifyAttributes(element.attributes, trim)}>` + ArraytoHTML(element.children, {...options, tabulator: '', linebreak: ''}, 0) + `</${element.type}>`;
		}
		else if (hasElementChild)
		{
			string += ( linebreak.repeat(depth > 0) + tabulator.repeat(depth) ).repeat(addWhiteSpace) + `<${element.type}${stringifyAttributes(element.attributes, trim)}>` + ArraytoHTML(element.children, options, depth + 1) + linebreak + tabulator.repeat(depth) + `</${element.type}>`;
		}
		else if (element.innerHTML.trim().length == 0)
		{
			string += ( linebreak.repeat(depth > 0) + tabulator.repeat(depth) ).repeat(addWhiteSpace) + `<${element.type}${stringifyAttributes(element.attributes, trim)}></${element.type}>`;
		}
		else
		{
			string += ( linebreak.repeat(depth > 0) + tabulator.repeat(depth) ).repeat(addWhiteSpace) + `<${element.type}${stringifyAttributes(element.attributes, trim)}>` + element.innerHTML + `</${element.type}>`;
		}
		addWhiteSpace = !isLiteralTag(element.type);
	}
	return string;
}

//export { HTMLtoArray, ArraytoHTML, stringifyAttributes };
