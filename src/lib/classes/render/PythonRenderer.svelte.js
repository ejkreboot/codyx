import { CellRenderer } from './CellRenderer.svelte.js';
import PythonCellRenderer from '$lib/components/renderers/PythonCellRenderer.svelte';

/**
 * Python Cell Renderer
 * Handles Python code execution, variable tracking, and import suggestions
 */
export class PythonRenderer extends CellRenderer {
    constructor(cellId, cellIndex, initialText = '') {
        super(cellId, cellIndex, initialText, 'python');
        this.output = $state(null);
        this.isExecuting = $state(false);
        this.isEditing = $state(false);
        this.variables = $state({});
        this.globalVariables = $state({});
        this.importSuggestions = $state([]);
        
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
            component: PythonCellRenderer,
            props: {
                renderer: this,
                ...props
            }
        };
    }
    
    async execute() {
        if (!this.text.trim()) {
            return { success: false, error: 'No Python code to execute' };
        }

        this.isExecuting = true;
        this.output = null;

        try {
            // Check if pyodideService is available
            if (!this.pyodideService) {
                throw new Error('Python service not initialized. Please wait and try again.');
            }

            const result = await this.pyodideService.executeCode(this.text);
            
            if (result.error) {
                this.output = {
                    type: 'error',
                    content: result.error
                };
                this.isExecuting = false;
                return { success: false, error: result.error };
            }

            // Handle different output types
            const hasPlots = result.hasPlot && result.plotData;
            const hasText = result.output && result.output.trim();
            
            if (hasPlots && hasText) {
                // Both plots and text output
                this.output = {
                    type: 'mixed',
                    textContent: result.output,
                    plots: [result.plotData] // Python typically has one plot at a time
                };
            } else if (hasPlots) {
                // Only plots
                this.output = {
                    type: 'plot',
                    content: result.plotData,
                    plots: [result.plotData]
                };
            } else if (hasText) {
                // Only text output
                this.output = {
                    type: 'text',
                    content: result.output
                };
            } else {
                // No visible output
                this.output = {
                    type: 'text',
                    content: '(No output)'
                };
            }
            
            // Update variables if available
            if (result.userVariables) {
                this.variables = result.userVariables;
            }
            
            this.isExecuting = false;
            return { success: true, output: this.output };
            
        } catch (error) {
            this.output = {
                type: 'error',
                content: error.message || String(error)
            };
            this.isExecuting = false;
            return { success: false, error: error.message || String(error) };
        }
    }
    
    clear() {
        this.output = null;
        this.isExecuting = false;
        // Could also clear variables if needed
        // this.variables = {};
    }

    /**
     * Start editing mode
     */
    startEditing() {
        this.isEditing = true;
    }

    /**
     * Stop editing mode  
     */
    stopEditing() {
        this.isEditing = false;
    }
    
    handleInput = (event) => {
        this.updateImportSuggestions();
        console.log('Import suggestions:', this.importSuggestions); 
    }
    
    /**
     * Get variables from Python environment
     * @returns {Promise<Array<string>>} Array of user-defined variable names
     */
    async getVariables() {
        try {
            // Check if pyodideService is available
            if (!this.pyodideService) {
                console.warn('Python service not initialized yet');
                return [];
            }

            // Execute Python code to get user-defined variables
            const pythonCode = `
import builtins
builtin_names = set(dir(builtins))
user_vars = [name for name in globals() if not name.startswith('_') and name not in builtin_names and not callable(globals()[name]) or name in ['pd', 'np', 'plt', 'sns']]
print(user_vars)
            `.trim();
            
            const result = await this.pyodideService.executeCode(pythonCode);
            
            if (result?.output && !result.error) {
                // Parse Python list output: ['x', 'y', 'data'] → ['x', 'y', 'data']
                const output = result.output.trim();
                
                // Handle empty list case
                if (output === '[]') {
                    return [];
                }
                
                // Parse the Python list string
                try {
                    // Remove surrounding brackets and split by comma
                    const listContent = output.slice(1, -1); // Remove [ and ]
                    if (!listContent.trim()) return [];
                    
                    const vars = listContent.split(',')
                        .map(item => item.trim().replace(/['"]/g, '')) // Remove quotes
                        .filter(item => item.length > 0);                        
                    return vars;
                } catch (parseError) {
                    console.warn('Failed to parse Python variables output:', output);
                    return [];
                }
            }
            
            return [];
        } catch (error) {
            console.warn('Failed to get Python variables:', error);
            return [];
        }
    }
    
    updateHighlighting(variables) {
        this.globalVariables = variables;
    }
    
    /**
     * Get icon configuration for Python cells
     * @returns {Object} Icon configuration
     */
    getIconConfig() {
        return {
            type: 'custom-symbol',
            icon: 'python-symbol',
            color: '#3776ab'
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
        this.isExecuting = false;
        this.isEditing = false;
        this.output = null;
    }
}