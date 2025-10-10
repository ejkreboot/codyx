# Codyx Notebook Architecture

Understanding the design principles and information flow in Codyx's interactive computing platform.

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Component Hierarchy](#component-hierarchy)
- [Information Flow](#information-flow)
- [Cell Lifecycle](#cell-lifecycle)
- [Integration Points](#integration-points)
- [Design Principles](#design-principles)

---

## Architectural Overview

Codyx follows a **Model-View-Controller (MVC)** pattern with clear separation of concerns between business logic, presentation, and user interaction. The architecture is designed to support multiple programming languages (Python, R, JavaScript) while maintaining consistent behavior and extensibility.

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CodyxCell     │    │  CellController │    │   CodeEdytor    │
│   (Container)   │◄──►│  (Business)     │◄──►│   (Editor)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cell Renderers  │    │    Services     │    │  Tree-sitter    │
│ (Presentation)  │    │ (Execution)     │    │   (Parsing)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Layer Responsibilities

1. **Presentation Layer**: Svelte components handling UI rendering and user interaction
2. **Business Layer**: Controllers managing state, execution, and cell lifecycle
3. **Service Layer**: Language runtimes (Pyodide, WebR) and execution environments
4. **Editor Layer**: CodeEdytor providing syntax highlighting, completions, and parsing

---

## Component Hierarchy

### 1. CodyxCell (Universal Container)

**Purpose**: Universal cell container that manages the overall cell lifecycle and coordinates between different components.

**Responsibilities**:
- Cell lifecycle management (create, mount, unmount, destroy)
- Component coordination between renderer and controller
- Event delegation and state synchronization
- Cell metadata management

**Key Features**:
- Language-agnostic container
- Reactive state management with Svelte 5 runes
- Consistent API across all cell types

### 2. CellController (Business Logic)

**Purpose**: Abstract base class defining the interface for all cell types, handling business logic and state management.

**Architecture**:
```typescript
abstract class CellController {
  // Core state (Svelte 5 runes)
  text: string;           // Cell content
  isEditing: boolean;     // Edit mode state
  isDirty: boolean;       // Unsaved changes flag
  
  // Abstract methods (must implement)
  abstract render(): RenderConfig;
  abstract execute(): Promise<ExecutionResult>;
  abstract clear(): void;
  abstract handleInput(event: Event): void;
}
```

**Subclass Implementations**:
- **PythonCellController**: Python execution via Pyodide
- **RCellController**: R statistical computing via WebR  
- **MarkdownCellController**: Rich text formatting

### 3. Cell Renderers (Presentation Layer)

**Purpose**: Svelte components responsible for UI rendering and user interaction specific to each cell type.

**Common Interface**:
```typescript
interface CellRendererProps {
  controller: CellController;  // Business logic reference
  cellId: string;             // Unique cell identifier
  cellIndex: number;          // Position in notebook
}
```

**Renderer Implementations**:
- **PythonCellRenderer**: Code editor + execution controls + output display
- **RCellRenderer**: Statistical computing interface + package management
- **MarkdownCellRenderer**: Edit/preview toggle + rich text rendering

### 4. CodeEdytor (Advanced Editor)

**Purpose**: Sophisticated code editor providing syntax highlighting, intelligent completions, and language-specific features.

**Key Capabilities**:
- **Syntax Highlighting**: Tree-sitter based parsing for accurate highlighting
- **Auto-completion**: Context-aware suggestions for keywords, variables, functions
- **Variable Highlighting**: Real-time highlighting of variables in current namespace
- **Snippet Support**: Expandable code templates with placeholders
- **Multi-language**: Support for Python, R, JavaScript with extensible architecture

---

## Information Flow

### 1. User Input Flow

```
User Types
    │
    ▼
┌─────────────────┐
│   CodeEdytor    │ ◄── Tree-sitter parsing
│                 │ ◄── Completion engine
└─────────────────┘
    │ oninput event
    ▼
┌─────────────────┐
│ CellRenderer    │ ◄── UI event handling
│                 │ ◄── Visual feedback
└─────────────────┘
    │ handleInput()
    ▼
┌─────────────────┐
│ CellController  │ ◄── State management
│                 │ ◄── Business logic
└─────────────────┘
    │ updateText()
    ▼
┌─────────────────┐
│   Notebook      │ ◄── Persistence
│   Storage       │ ◄── Collaboration
└─────────────────┘
```

### 2. Code Execution Flow

```
Execute Button Pressed
    │
    ▼
┌─────────────────┐
│ CellRenderer    │ ◄── UI trigger
└─────────────────┘
    │ controller.execute()
    ▼
┌─────────────────┐
│ CellController  │ ◄── Validation
│                 │ ◄── Pre-processing
└─────────────────┘
    │ service.runCode()
    ▼
┌─────────────────┐
│ Runtime Service │ ◄── Python (Pyodide)
│                 │ ◄── R (WebR)
└─────────────────┘
    │ execution result
    ▼
┌─────────────────┐
│ CellController  │ ◄── Result processing
│                 │ ◄── State update
└─────────────────┘
    │ reactive update
    ▼
┌─────────────────┐
│ CellRenderer    │ ◄── Output display
│                 │ ◄── Visual feedback
└─────────────────┘
```

### 3. Variable Highlighting Flow

```
Code Execution Completes
    │
    ▼
┌─────────────────┐
│ Runtime Service │ ◄── Extract namespace
│                 │ ◄── Get variable names
└─────────────────┘
    │ getVariables()
    ▼
┌─────────────────┐
│ CellController  │ ◄── Process variables
│                 │ ◄── Update state
└─────────────────┘
    │ setAvailableVariables()
    ▼
┌─────────────────┐
│   CodeEdytor    │ ◄── Update highlighting
│                 │ ◄── Refresh completions
└─────────────────┘
    │ visual update
    ▼
┌─────────────────┐
│ Editor Display  │ ◄── Orange underlines
│                 │ ◄── Enhanced completions
└─────────────────┘
```

---

## Cell Lifecycle

### 1. Cell Creation

```typescript
// 1. Notebook creates cell instance
const controller = new PythonCellController(cellId, cellIndex, initialCode);

// 2. CodyxCell mounts with controller
<CodyxCell {controller} {cellId} {cellIndex} />

// 3. Controller determines renderer
const renderConfig = controller.render();
// Returns: { component: PythonCellRenderer, props: {...} }

// 4. Renderer initializes with CodeEdytor
<CodeEdytor 
  editorClass={PythonCodeEdytor}
  bind:value={controller.text}
  availableVariables={controller.variables}
/>
```

### 2. Cell Interaction

```typescript
// User types in editor
CodeEdytor.oninput() 
  → CellRenderer.handleInput()
    → CellController.handleInput()
      → controller.updateText(newText)
        → Reactive state update
          → UI re-render

// User executes cell
CellRenderer.executeButton.onclick()
  → CellController.execute()
    → RuntimeService.runCode()
      → Update output state
        → UI shows results
          → Extract variables
            → Update CodeEdytor highlighting
```

### 3. Cell Destruction

```typescript
// Cell removed from notebook
CodyxCell.onDestroy()
  → CellController.onDestroy()
    → Cleanup subscriptions
      → Release resources
        → Remove from DOM
```

---

## Integration Points

### 1. Controller ↔ Renderer

**Interface**: Controllers expose reactive state that renderers consume

```typescript
// Controller exposes
class PythonCellController {
  text = $state('');           // Code content
  output = $state(null);       // Execution results  
  isExecuting = $state(false); // Loading state
  variables = $state({});      // Available variables
}

// Renderer consumes
<script>
  export let controller;
  // Automatically reactive to controller state changes
</script>
```

### 2. Renderer ↔ CodeEdytor

**Interface**: Two-way binding with enhanced features

```typescript
// Renderer provides
<CodeEdytor 
  editorClass={PythonCodeEdytor}
  bind:value={controller.text}                    // Two-way binding
  availableVariables={controller.variables}       // Variable highlighting
  oninput={(e) => controller.handleInput(e)}      // Input handling
  width="100%" 
  height="300px"
/>

// CodeEdytor provides
- Syntax highlighting via Tree-sitter
- Intelligent auto-completion
- Variable highlighting
- Code snippets
- Language-specific features
```

### 3. Controller ↔ Services

**Interface**: Async execution with state management

```typescript
// Python execution
class PythonCellController {
  async execute() {
    this.isExecuting = true;
    try {
      const result = await pyodideService.runPython(this.text);
      this.output = result.output;
      this.variables = await pyodideService.getGlobalVariables();
    } finally {
      this.isExecuting = false;
    }
  }
}
```

---

## Design Principles

### 1. Separation of Concerns

- **Controllers**: Pure business logic, no DOM manipulation
- **Renderers**: UI presentation and user interaction only  
- **Services**: External integrations and execution environments
- **Editor**: Text editing with language-specific enhancements

### 2. Reactive Architecture

**Svelte 5 Runes**: Fine-grained reactivity for optimal performance

```typescript
// State flows automatically through the component tree
controller.text = $state('new code');
// ↓ Triggers reactive updates
// ↓ CodeEdytor updates display
// ↓ UI reflects new state
```

### 3. Language Extensibility

**Plugin Architecture**: Adding new languages requires implementing:

```typescript
// 1. Controller subclass
class NewLanguageController extends CellController {
  async execute() { /* language-specific execution */ }
  render() { /* return renderer component */ }
}

// 2. CodeEdytor subclass  
class NewLanguageEdytor extends CodeEdytor {
  getKeywords() { /* language keywords */ }
  getBuiltinFunctions() { /* language builtins */ }
}

// 3. Renderer component
<NewLanguageRenderer {controller} />
```

### 4. Performance Optimization

- **Lazy Loading**: Language parsers loaded on demand
- **Reactive Updates**: Only changed components re-render
- **Worker Isolation**: Heavy computation in Web Workers (Pyodide, WebR)
- **Memory Management**: Proper cleanup and resource disposal

### 5. Developer Experience

- **Type Safety**: Full TypeScript support throughout
- **Hot Reloading**: Instant feedback during development  
- **Comprehensive Documentation**: JSDoc for all APIs
- **Testing**: Unit and integration tests for reliability

---

## Future Enhancements

### Planned Improvements

1. **Multi-cursor Editing**: Collaborative editing with operational transform
2. **Advanced Debugging**: Breakpoints and step-through debugging
3. **Package Management**: Visual package installation and management
4. **Cell Templates**: Predefined cell templates for common tasks
5. **Export Formats**: Jupyter notebook, PDF, HTML export

### Architecture Evolution

The modular design supports future enhancements without breaking changes:

- **New Languages**: Simply implement the Controller/Renderer/Editor interfaces
- **Advanced Features**: Add as optional mixins or plugins
- **Platform Integration**: Extend services for cloud/server integration
- **UI Themes**: Renderer components support full theming

---

This architecture provides a solid foundation for interactive computing while maintaining flexibility for future growth and customization.
