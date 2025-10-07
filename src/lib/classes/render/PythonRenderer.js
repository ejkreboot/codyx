import { CellRenderer } from './CellRenderer.svelte.js';

/**
 * Python Cell Renderer
 * Handles Python code execution, variable tracking, and import suggestions
 */
export class PythonRenderer extends CellRenderer {
    constructor(cellId, cellIndex, initialText = '') {
        super('code', cellId, cellIndex, initialText);
        this.variables = {};
        this.globalVariables = {};
        this.importSuggestions = [];
        this.executeFunction = null;
        this.clearFunction = null;
        
        // Import pyodide service
        import('../pyodide-service.js').then(({ pyodideService }) => {
            this.pyodideService = pyodideService;
            this.subscribeToGlobalVariables();
        });
        
        // Import package data
        import('../pyodide-packages.json').then(data => {
            this.packageMapping = this.createPackageMapping(data.packages);
        });
    }
    
    render(props) {
        return {
            component: 'PythonArea',
            props: {
                code: this.text,
                cellId: this.cellId,
                cellIndex: this.cellIndex,
                variables: this.variables,
                globalVariables: this.globalVariables,
                importSuggestions: this.importSuggestions
            }
        };
    }
    
    async execute() {
        if (!this.executeFunction) {
            throw new Error('Python execution function not bound');
        }
        
        this.onBeforeExecute();
        const result = await this.executeFunction();
        this.onAfterExecute(result);
        
        return result;
    }
    
    clear() {
        if (this.clearFunction) {
            this.clearFunction();
        }
    }
    
    handleInput(event) {
        this.updateText(event.target.value);
        this.autoResizeTextarea(event.target);
        this.updateImportSuggestions();
    }
    
    getVariables() {
        return this.variables;
    }
    
    updateHighlighting(variables) {
        this.globalVariables = variables;
    }
    
    getExecutionBindings() {
        return {
            executePython: (fn) => { this.executeFunction = fn; },
            clearOutput: (fn) => { this.clearFunction = fn; },
            variables: (vars) => { this.variables = vars; }
        };
    }
    
    // ============ PYTHON-SPECIFIC METHODS ============
    
    /**
     * Subscribe to global variable changes from PyodideService
     */
    subscribeToGlobalVariables() {
        if (this.pyodideService) {
            this.unsubscribeFromVariables = this.pyodideService.subscribeToVariables(
                (variables) => {
                    this.globalVariables = variables;
                }
            );
        }
    }
    
    /**
     * Create mapping from import names to package names
     * @param {Array} packages - Available packages
     * @returns {Object} - Package mapping
     */
    createPackageMapping(packages) {
        const mapping = {};
        packages.forEach(pkg => {
            mapping[pkg] = pkg;
        });
        
        const specialMappings = {
            'sklearn': 'scikit-learn',
            'cv2': 'opencv-python',
            'PIL': 'Pillow', 
            'bs4': 'beautifulsoup4',
            'yaml': 'pyyaml',
            'Image': 'Pillow',
            'requests': 'requests'
        };
        
        Object.assign(mapping, specialMappings);
        return mapping;
    }
    
    /**
     * Update import suggestions based on current text
     */
    updateImportSuggestions() {
        if (!this.packageMapping) return;
        
        const suggestions = [];
        const lines = this.text.split('\n');
        const suggestedPackages = new Set();
        
        lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#') || trimmed === '') return;
            
            const importPatterns = [
                /^import\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
                /^from\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+import/,
                /^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/,
            ];
            
            for (const pattern of importPatterns) {
                const match = trimmed.match(pattern);
                if (match && match[1]) {
                    const packageNames = match[1].split(',').map(name => name.trim());
                    
                    for (const packageName of packageNames) {
                        if (this.packageMapping[packageName] && !suggestedPackages.has(packageName)) {
                            const installName = this.packageMapping[packageName];
                            const isAlreadyInstalling = lines.some(l => {
                                const installPattern = new RegExp(
                                    `micropip\\.install\\s*\\(\\s*['"\`]${installName}['"\`]\\s*\\)`
                                );
                                return installPattern.test(l.trim());
                            });

                            if (!isAlreadyInstalling) {
                                suggestions.push({
                                    line: lineIndex,
                                    packageName: packageName,
                                    installName: installName,
                                    originalLine: line
                                });
                                suggestedPackages.add(packageName);
                            }
                        }
                    }
                }
            }
        });
        
        this.importSuggestions = suggestions;
    }
    
    /**
     * Insert package installation code at the appropriate line
     * @param {Object} suggestion - Import suggestion object
     */
    insertInstallCode(suggestion) {
        const lines = this.text.split('\n');
        
        const hasMicropipImport = lines.some(line => 
            line.trim().match(/^import\s+micropip\s*$/)
        );
        
        let installCode = '';
        if (!hasMicropipImport) {
            installCode += 'import micropip\n';
        }
        installCode += `await micropip.install('${suggestion.installName}')`;
        
        lines.splice(suggestion.line, 0, installCode);
        this.updateText(lines.join('\n'));
        
        this.importSuggestions = this.importSuggestions.filter(s => s !== suggestion);
    }
    
    /**
     * Generate highlighted code with variable highlighting
     * @param {string} code - Source code
     * @param {Object} variables - Variables to highlight
     * @returns {string} - HTML with highlighted variables
     */
    getHighlightedCode(code, variables) {
        if (!code || !variables || Object.keys(variables).length === 0) {
            return code;
        }
        
        const variableNames = Object.keys(variables);
        if (variableNames.length === 0) return code;
        
        let highlightedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        variableNames.sort((a, b) => b.length - a.length);
        
        for (const varName of variableNames) {
            const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b(${escapedVarName})\\b(?![^<]*>)`, 'g');
            highlightedCode = highlightedCode.replace(regex, '<span class="defined-variable">$1</span>');
        }
        
        return highlightedCode;
    }
    
    /**
     * Cleanup when renderer is destroyed
     */
    onDestroy() {
        if (this.unsubscribeFromVariables) {
            this.unsubscribeFromVariables();
        }
    }
}