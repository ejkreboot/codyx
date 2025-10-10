# Code-Edytor TypeScript Interface Documentation

This document provides TypeScript-style interface definitions for external integrators building applications with code-edytor components.

## Table of Contents

- [CodeEdytor Svelte Component](#codeedytor-svelte-component)
- [RCodeEdytor Class](#rcodeedytor-class)
- [PythonCodeEdytor Class](#pythoncodeedytor-class)
- [JSCodeEdytor Class](#jscodeedytor-class)
- [Base CodeEdytor Class](#base-codeedytor-class)
- [Variable Highlighting System](#variable-highlighting-system)

---

## CodeEdytor Svelte Component

The main Svelte component for rendering a code editor with syntax highlighting and completions.

### Props Interface

```typescript
interface CodeEdytorProps {
	// Required Props
	editorClass: typeof RCodeEdytor | typeof PythonCodeEdytor | typeof JSCodeEdytor;

	// Code Content
	initialCode?: string; // Initial code content (default: "")
	value?: string; // For two-way binding with bind:value

	// Variable Highlighting
	availableVariables?: string[]; // Variables in current namespace (reactive)
	onVariableRequest?: () => Promise<string[]>; // Callback to fetch fresh variables

	// Event Callbacks
	oninput?: (event: Event) => void; // Called on every input change
	onblur?: (event: Event) => void; // Called when editor loses focus
	onfocus?: (event: Event) => void; // Called when editor gains focus

	// Dimensions
	width?: string; // Editor width (default: "100%")
	height?: string; // Editor height (default: "200px")
	minHeight?: string; // Minimum height (default: "200px")
	maxHeight?: string; // Maximum height (default: "200px")
	maxWidth?: string; // Maximum width (default: "100%")
	minWidth?: string; // Minimum width (default: "300px")

	// Styling
	fontFamily?: string; // Font family (default: "Monaspace Neon VF")
}
```

### Methods Interface

```typescript
interface CodeEdytorMethods {
	/**
	 * Update editor content from external source
	 * @param newCode - The new code to set
	 * @param preserveCursor - Whether to preserve cursor position (default: false)
	 */
	updateCode(newCode: string, preserveCursor?: boolean): void;

	/**
	 * Get current code content
	 * @returns Current code as string
	 */
	getCode(): string;
}
```

### Events Interface

```typescript
interface CodeEdytorEvents {
	// Input event - triggered on every keystroke
	input: {
		target: { value: string };
		type: 'input';
	};

	// Focus event - triggered when editor gains focus
	focus: Event;

	// Blur event - triggered when editor loses focus
	blur: Event;
}
```

### Usage Example

```typescript
import { CodeEdytor } from 'code-edytor';
import { RCodeEdytor } from 'code-edytor/r';

let editorRef: CodeEdytor;
let code = 'library(dplyr)';

// Handle input changes
function handleInput(event: Event) {
	console.log('Code changed:', (event.target as HTMLTextAreaElement).value);
}

// Update editor from external source
function updateFromExternal() {
	editorRef.updateCode('new_code <- 42', false);
}

// Get current code
function getCurrentCode(): string {
	return editorRef.getCode();
}
```

```svelte
<CodeEdytor
	bind:this={editorRef}
	editorClass={RCodeEdytor}
	bind:value={code}
	availableVariables={['df', 'model', 'results']}
	oninput={handleInput}
	onfocus={() => console.log('Focused')}
	onblur={() => console.log('Blurred')}
	width="800px"
	height="400px"
/>
```

---

## RCodeEdytor Class

R language editor implementation extending the base CodeEdytor class.

### Class Interface

```typescript
class RCodeEdytor extends CodeEdytor {
	constructor();

	// Inherited from CodeEdytor
	parser: Parser | null;
	content: string;
	cursor: { row: number; column: number };
	tree: Tree | null;
	language: string;
	snippets: Map<string, Snippet>;
	availableVariables: string[];

	// R-specific overrides
	makeParser(): Promise<Parser>;
	getKeywords(): string[];
	getBuiltinFunctions(): Record<string, string | string[]>;
	shouldTriggerCompletion(char: string, position: Position): boolean;
	collectIdentifiers(tree: Tree, cursorIndex: number): Set<string>;
}
```

### Keywords

```typescript
const R_KEYWORDS = [
	'if',
	'else',
	'for',
	'while',
	'repeat',
	'function',
	'in',
	'next',
	'break',
	'TRUE',
	'FALSE',
	'NULL',
	'NA',
	'NaN',
	'Inf'
];
```

### Completion Triggers

R editor triggers completions on:

- Letters (a-zA-Z)
- Dot (`.`)
- Double colon (`::`) for package functions
- Space (for snippets)

### Usage Example

```typescript
import { RCodeEdytor } from 'code-edytor/r';

const editor = new RCodeEdytor();
await editor.init();

// Set available variables
editor.setAvailableVariables(['df', 'model', 'summary_stats']);

// Process input
editor.onInput('library(dplyr)\ndf %>% filter(');

// Get completions
const position = { row: 1, column: 15 };
const completions = await editor.getCompletions(position);
// Returns: keywords, identifiers, available variables, and builtin functions
```

---

## PythonCodeEdytor Class

Python language editor implementation extending the base CodeEdytor class.

### Class Interface

```typescript
class PythonCodeEdytor extends CodeEdytor {
	constructor();

	// Inherited from CodeEdytor
	parser: Parser | null;
	content: string;
	cursor: { row: number; column: number };
	tree: Tree | null;
	language: string;
	snippets: Map<string, Snippet>;
	availableVariables: string[];

	// Python-specific overrides
	makeParser(): Promise<Parser>;
	getKeywords(): string[];
	getBuiltinFunctions(): Record<string, { description: string }>;
}
```

### Keywords

```typescript
const PYTHON_KEYWORDS = [
	// Control flow
	'if',
	'elif',
	'else',
	'for',
	'while',
	'break',
	'continue',
	'pass',
	// Functions and classes
	'def',
	'class',
	'return',
	'yield',
	'lambda',
	// Exception handling
	'try',
	'except',
	'finally',
	'raise',
	'assert',
	// Imports
	'import',
	'from',
	'as',
	// Boolean and None
	'True',
	'False',
	'None',
	'and',
	'or',
	'not',
	'is',
	'in',
	// Other keywords
	'global',
	'nonlocal',
	'del',
	'with',
	'async',
	'await'
];
```

### Builtin Functions

```typescript
const PYTHON_BUILTINS = {
	print: { description: 'Print objects to the text stream' },
	len: { description: 'Return the length of an object' },
	range: { description: 'Generate a sequence of numbers' },
	enumerate: { description: 'Return enumerate object' },
	zip: { description: 'Combine iterables' },
	map: { description: 'Apply function to every item of iterable' },
	filter: { description: 'Filter elements from iterable' }
	// ... and many more
};
```

### Usage Example

```typescript
import { PythonCodeEdytor } from 'code-edytor/python';

const editor = new PythonCodeEdytor();
await editor.init();

// Set available variables from notebook namespace
editor.setAvailableVariables(['df', 'x', 'y', 'results']);

// Process input
editor.onInput('import pandas as pd\ndf.head()');

// Get completions at cursor
const position = { row: 1, column: 3 };
const completions = await editor.getCompletions(position);
```

---

## JSCodeEdytor Class

JavaScript language editor implementation extending the base CodeEdytor class.

### Class Interface

```typescript
class JSCodeEdytor extends CodeEdytor {
	constructor();

	// Inherited from CodeEdytor
	parser: Parser | null;
	content: string;
	cursor: { row: number; column: number };
	tree: Tree | null;
	language: string;
	snippets: Map<string, Snippet>;
	availableVariables: string[];

	// JavaScript-specific overrides
	makeParser(): Promise<Parser>;
	getKeywords(): string[];
	getBuiltinFunctions(): Record<string, { description: string }>;
}
```

### Usage Example

```typescript
import { JSCodeEdytor } from 'code-edytor/js';

const editor = new JSCodeEdytor();
await editor.init();

// Set available variables
editor.setAvailableVariables(['users', 'data', 'config']);

// Process input
editor.onInput('const result = users.filter(');
```

---

## Base CodeEdytor Class

The base class that all language-specific editors extend.

### Class Interface

```typescript
interface Position {
	row: number;
	column: number;
}

interface Completion {
	label: string;
	type?: 'snippet';
	kind?: 'keyword' | 'variable' | 'function' | 'text';
	insertText?: string;
	description?: string;
	trigger?: string;
	replaceLength?: number;
}

interface Snippet {
	label: string;
	snippet: string;
	description: string;
}

abstract class CodeEdytor {
	// Properties
	parser: Parser | null;
	content: string;
	shadow: string;
	cursor: Position;
	selection: any;
	tree: Tree | null;
	language: string;
	snippets: Map<string, Snippet>;
	availableVariables: string[];

	// Constructor
	constructor(language: string | null);

	// Initialization
	init(): Promise<void>;
	abstract makeParser(): Promise<Parser>;

	// Language-specific methods (must be implemented by subclasses)
	abstract getKeywords(): string[];
	abstract getBuiltinFunctions(): Record<string, any>;

	// Snippet management
	loadSnippets(): Promise<void>;
	getSnippetCompletions(prefix: string, position: Position): Completion[];
	processSnippet(snippetText: string): string;
	processSnippetWithIndentation(snippetText: string, position: Position): string;
	hasMatchingSnippets(prefix: string): boolean;

	// Identifier collection
	collectIdentifiers(tree: Tree, cursorIndex: number): Set<string>;

	// Input handling
	onInput(newText: string): void;

	// Variable management
	setAvailableVariables(variables: string[]): void;
	getAvailableVariables(): string[];

	// Position/index conversion
	textIndexToPosition(text: string, index: number): Position;
	positionToTextIndex(text: string, row: number, column: number): number;

	// Completion system
	shouldTriggerCompletion(char: string, position: Position): boolean;
	getCompletionPrefix(position: Position): string;
	getSnippetPrefix(position: Position): string;
	getCompletionSuffix(position: Position): string;
	getCompletions(position: Position, prioritizeSnippets?: boolean): Promise<Completion[]>;
	getTrimmedCompletions(position: Position, prioritizeSnippets?: boolean): Promise<Completion[]>;
	shouldPrioritizeSnippets(char: string, position: Position): boolean;
	completeSymbol(prefix: string, tree: Tree, cursorIndex: number): Completion[];

	// Indentation helpers
	getCurrentIndentation(position: Position): string;
	applyIndentationToSnippet(snippetText: string, indentation: string, position: Position): string;
}
```

### Usage Example

```typescript
// Extend the base class for a new language
import { CodeEdytor } from 'code-edytor/base';

class CustomLanguageEdytor extends CodeEdytor {
	constructor() {
		super('custom');
	}

	async makeParser() {
		// Initialize tree-sitter parser
		const parser = new Parser();
		const CustomLang = await Parser.Language.load('/tree-sitter-custom.wasm');
		parser.setLanguage(CustomLang);
		return parser;
	}

	getKeywords() {
		return ['keyword1', 'keyword2', 'keyword3'];
	}

	getBuiltinFunctions() {
		return {
			func1: { description: 'Function 1 description' },
			func2: { description: 'Function 2 description' }
		};
	}
}
```

---

## Variable Highlighting System

The variable highlighting system allows editors to highlight variables that exist in the current execution namespace.

### How It Works

1. **Setting Variables**: Pass an array of variable names via the `availableVariables` prop
2. **Dynamic Updates**: Variables are reactively highlighted as they update
3. **Async Fetching**: Use `onVariableRequest` callback to fetch fresh variables on demand

### Interface

```typescript
interface VariableHighlighting {
	// Static variable list (reactive)
	availableVariables?: string[];

	// Dynamic variable fetching
	onVariableRequest?: () => Promise<string[]>;
}
```

### Visual Appearance

Variables in the `availableVariables` array are highlighted with:

- **Color**: Orange (`#faa336`)
- **Decoration**: Underline with subtle color
- **CSS Class**: `.known-variable`

### Usage Examples

#### Static Variables

```svelte
<script>
	import { CodeEdytor, PythonCodeEdytor } from 'code-edytor';

	let variables = ['df', 'x', 'y', 'model'];
</script>

<CodeEdytor editorClass={PythonCodeEdytor} availableVariables={variables} />
```

#### Dynamic Variables (Notebook Integration)

```svelte
<script>
	import { CodeEdytor, PythonCodeEdytor } from 'code-edytor';

	// Fetch variables from Jupyter/IPython kernel
	async function fetchNamespaceVariables() {
		const response = await kernel.execute('list(globals().keys())');
		return response.data; // ['df', 'x', 'y', ...]
	}
</script>

<CodeEdytor editorClass={PythonCodeEdytor} onVariableRequest={fetchNamespaceVariables} />
```

#### Programmatic Variable Management

```typescript
import { RCodeEdytor } from 'code-edytor/r';

const editor = new RCodeEdytor();
await editor.init();

// Set variables from R session
editor.setAvailableVariables(['dataset', 'model', 'predictions']);

// Get current variables
const currentVars = editor.getAvailableVariables();
// Returns: ['dataset', 'model', 'predictions']
```

### Integration with Completion System

Variables from `availableVariables` are included in autocompletion suggestions:

- **Type**: `'variable'`
- **Priority**: Equal to identifiers found in code
- **Trigger**: Typing letter characters

```typescript
// Example completion result with available variables
const completions = [
	{ label: 'df', kind: 'variable' }, // From availableVariables
	{ label: 'data', kind: 'variable' }, // From code identifiers
	{ label: 'dplyr', kind: 'keyword' }, // From keywords
	{ label: 'mean', kind: 'function' } // From builtin functions
];
```

---

## Type Definitions Summary

```typescript
// Main exports
export { default as CodeEdytor } from './components/CodeEdytor.svelte';
export { CodeEdytor as BaseCodeEdytor } from './classes/code_edytor.js';
export { RCodeEdytor } from './classes/r_code_edytor.js';
export { PythonCodeEdytor } from './classes/python_code_edytor.js';
export { JSCodeEdytor } from './classes/js_code_edytor.js';

// Supporting types
export interface Position {
	row: number;
	column: number;
}

export interface Completion {
	label: string;
	type?: 'snippet';
	kind?: 'keyword' | 'variable' | 'function' | 'text';
	insertText?: string;
	description?: string;
	trigger?: string;
	replaceLength?: number;
}

export interface Snippet {
	label: string;
	snippet: string;
	description: string;
}
```

---

## Common Integration Patterns

### Real-Time Collaboration

```typescript
import { CodeEdytor, PythonCodeEdytor } from 'code-edytor';

let editorRef: CodeEdytor;

function handleInput(event: Event) {
	const newCode = (event.target as HTMLTextAreaElement).value;
	// Send to collaboration server
	collaborationClient.sendChange(newCode);
}

function handleRemoteChange(newCode: string) {
	// Update from other users, preserve cursor
	editorRef.updateCode(newCode, true);
}

collaborationClient.on('change', handleRemoteChange);
```

### Notebook Cell Integration

```typescript
import { CodeEdytor, RCodeEdytor } from 'code-edytor';

interface NotebookCell {
	editorRef: CodeEdytor;
	code: string;
	outputs: any[];
}

async function executeCell(cell: NotebookCell) {
	const code = cell.editorRef.getCode();
	const result = await kernelClient.execute(code);
	cell.outputs = result;
}

async function getNamespaceVariables() {
	const vars = await kernelClient.execute('ls()');
	return vars.data;
}
```

### Two-Way Data Binding

```svelte
<script lang="ts">
	import { CodeEdytor, JSCodeEdytor } from 'code-edytor';

	let code = 'console.log("Hello");';

	// This stays in sync with editor
	$: console.log('Current code:', code);
</script>

<CodeEdytor bind:value={code} editorClass={JSCodeEdytor} />

<!-- This input stays in sync too -->
<input bind:value={code} />
```

---

## Migration Guide

### From Plain Textarea

```diff
- <textarea bind:value={code} />
+ <CodeEdytor
+   editorClass={PythonCodeEdytor}
+   bind:value={code}
+ />
```

### Adding Variable Highlighting

```diff
  <CodeEdytor
    editorClass={RCodeEdytor}
    bind:value={code}
+   availableVariables={['df', 'model', 'summary']}
  />
```

### Adding Event Handlers

```diff
  <CodeEdytor
    editorClass={JSCodeEdytor}
    bind:value={code}
+   oninput={(e) => handleChange(e)}
+   onfocus={() => trackFocus()}
+   onblur={() => trackBlur()}
  />
```

---

## Support & Contribution

For issues, feature requests, or contributions, visit:

- **GitHub**: https://github.com/ejkreboot/code-edytor
- **Issues**: https://github.com/ejkreboot/code-edytor/issues

For usage questions, consult:

- **README.md**: Main documentation
- **Examples**: `/src/routes/+page.svelte` in repository
