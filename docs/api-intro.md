# Codyx API Reference

Welcome to the **Codyx API Reference**! This comprehensive documentation covers all the classes, methods, and interfaces that power Codyx's interactive computing environment.

## 🚀 About Codyx

**Codyx** is a browser-based collaborative notebook platform that lets you execute Python and R code seamlessly, interleaved with markdown documentation. Built with modern web technologies, it brings the power of data science to your browser with no installation required.

### Key Features

- **Python Support** - Full Pyodide integration with popular data science libraries
- **R Integration** - Complete WebR environment with statistical computing capabilities
- **Rich Documentation** - Enhanced markdown with live preview and editing
- **Real-time Collaboration** - Multiple users can edit simultaneously
- **Browser-native** - Runs entirely in your browser, no server required

## 🏗️ Architecture Overview

Codyx follows a clean **Model-View-Controller (MVC)** architecture:

- **Controllers** - Handle business logic, execution, and state management  
- **Components** - Manage UI rendering and user interactions
- **Services** - Provide external integrations (Python/R runtimes)
- **Utilities** - Support text processing and data management

## Documentation Sections

### Controllers (Business Logic)
The heart of Codyx's notebook functionality, managing code execution, variable tracking, and cell lifecycle.

### Core Infrastructure  
Essential classes that orchestrate notebook operations, persistence, and collaboration features.

### Runtime Services
Integrations with Pyodide (Python) and WebR (R) that bring computational power to the browser.

### Utilities
Helper classes for text processing, variable highlighting, and data management.

## 🎯 Quick Navigation Tips

- **Search** - Use the search box to quickly find classes or methods
- **Navigation** - Click on class names in the sidebar for instant access  
- **Examples** - Most methods include practical code examples
- **Types** - Comprehensive parameter and return type information

## 🔗 Related Resources

- **[Project Repository](https://github.com/ejkreboot/codyx)** - Source code and contributions
- **[User Documentation](../../../README.md)** - Getting started guides and tutorials  
- **[Live Demo](https://codyx.dev)** - Try Codyx in your browser

---

*This documentation is auto-generated from JSDoc comments in the source code using DocumentationJS.*