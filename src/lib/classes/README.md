# Codyx API Reference

Welcome to the **Codyx** API documentation! Codyx is an interactive computing platform that brings Python and R directly to your browser.

## 🚀 About Codyx

Codyx enables you to run Python and R code directly in the browser without any server-side dependencies. Built with modern web technologies, it provides a seamless notebook-like experience for data science and statistical computing.

### Key Features

- **🐍 Python Integration** - Full Python environment via Pyodide
- **📊 R Statistical Computing** - Native R support through WebR  
- **📝 Markdown Support** - Rich text formatting and documentation
- **⚡ Zero Installation** - Runs entirely in the browser
- **🎨 Modern UI** - Clean, responsive Svelte-based interface

## 🏗️ Architecture

Codyx follows a clean **Model-View-Controller** pattern:

### Controllers (`/lib/classes/cells/`)
Business logic and execution management for each cell type:
- **CellController** - Base class with common functionality
- **PythonCellController** - Python code execution and environment
- **RCellController** - R statistical computing integration  
- **MarkdownCellController** - Text formatting and rendering

### Components (`/lib/components/`)
Svelte UI components handling user interaction and presentation:
- **CodyxCell** - Universal cell container
- **PythonCellRenderer** - Python code editor and output
- **RCellRenderer** - R statistical computing interface
- **MarkdownCellRenderer** - Rich text editor and preview

### Services (`/lib/classes/`)
External integrations and utilities:
- **PyodideService** - Python runtime management
- **WebRService** - R environment integration
- **NotebookService** - File operations and persistence

## 🎯 Getting Started

Browse the documentation using the navigation menu to explore:
- **Classes** - Detailed API reference for all controllers and services
- **Modules** - Individual file documentation
- **Namespaces** - Organized code structure

---

**Built with ❤️ using Svelte 5, Pyodide, and WebR**