import { loadPyodide } from 'pyodide';

class PyodideService {
    constructor() {
        this.pyodide = null;
        this.initPromise = null;
        this.isInitialized = false;
    }

    async initialize() {
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }

        // Return existing instance if already initialized
        if (this.pyodide && this.isInitialized) {
            return this.pyodide;
        }

        // Create new initialization promise
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            
            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/"
            });
            
            // Load common packages
            await this.pyodide.loadPackage(['micropip', 'matplotlib', 'numpy', 'pandas']);
            
            // Set up global output capture system and matplotlib support
            await this.pyodide.runPython(`
                import sys
                from io import StringIO
                import traceback
                
                class OutputCapture:
                    def __init__(self):
                        self.output = StringIO()
                        self.original_stdout = sys.stdout
                        self.original_stderr = sys.stderr
                    
                    def start_capture(self):
                        self.output = StringIO()
                        sys.stdout = self.output
                        sys.stderr = self.output
                    
                    def stop_capture(self):
                        sys.stdout = self.original_stdout
                        sys.stderr = self.original_stderr
                        result = self.output.getvalue()
                        self.output.close()
                        return result

                _output_capture = OutputCapture()
                
                # Set up matplotlib for web output
                import matplotlib
                matplotlib.use('Agg')  # Use non-interactive backend
                import matplotlib.pyplot as plt
                import base64
                from io import BytesIO
                import warnings
                
                # Suppress the non-interactive backend warning
                warnings.filterwarnings('ignore', message='.*non-interactive.*', category=UserWarning)
                
                def capture_matplotlib():
                    """Capture current matplotlib figure as base64 image"""
                    if plt.get_fignums():  # Check if there are active figures
                        buf = BytesIO()
                        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                        buf.seek(0)
                        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                        plt.close('all')  # Close all figures
                        return f"__MATPLOTLIB_IMG__{img_base64}__END_IMG__"
                    return ""
                
                # Check what's available
                import sys
                print(f"📦 Python {sys.version}")
                
                available_modules = []
                for module in ['numpy', 'pandas', 'matplotlib', 'micropip']:
                    try:
                        __import__(module)
                        available_modules.append(module)
                    except ImportError:
                        pass
                
                print(f"📋 Available modules: {available_modules}")
                print("✅ Ready for Python code execution!")
            `);
            
            this.isInitialized = true;
            
            return this.pyodide;
            
        } catch (error) {
            console.error('❌ Failed to initialize Pyodide:', error);
            this.pyodide = null;
            this.initPromise = null;
            this.isInitialized = false;
            throw error;
        }
    }

    async executeCode(code) {
        const py = await this.initialize();
        if (!py) {
            throw new Error('Pyodide not available');
        }

        try {
            // Start capturing output
            await py.runPython('_output_capture.start_capture()');
            
            let output = '';
            let error = null;
            let hasPlot = false;
            let plotData = null;

            try {
                // Store the code in a Python variable to avoid escaping issues
                py.globals.set('__user_code__', code);
                
                // Execute user code directly - let JavaScript catch all errors
                await py.runPython('exec(__user_code__)');
                
                // Capture any matplotlib plots
                const plotOutput = await py.runPython('capture_matplotlib()');
                
                // Get captured text output
                const capturedOutput = await py.runPython('_output_capture.stop_capture()');
                
                // Check if the output contains error information
                if (capturedOutput && capturedOutput.includes('Traceback')) {
                    // Extract just the error line from the traceback
                    const lines = capturedOutput.split('\n');
                    const errorLine = lines.find(line => 
                        line.includes('Error:') || 
                        line.match(/^\w+Error:/) ||
                        line.match(/^\w+Exception:/)
                    );
                    
                    if (errorLine) {
                        error = errorLine.trim();
                        output = ''; // Clear output since this was an error
                    } else {
                        // Fallback: use the last non-empty line
                        const nonEmptyLines = lines.filter(line => line.trim());
                        if (nonEmptyLines.length > 0) {
                            error = nonEmptyLines[nonEmptyLines.length - 1].trim();
                            output = '';
                        }
                    }
                } else {
                    // Process plot output
                    if (plotOutput && plotOutput.includes('__MATPLOTLIB_IMG__')) {
                        hasPlot = true;
                        plotData = plotOutput.replace('__MATPLOTLIB_IMG__', '').replace('__END_IMG__', '');
                    }
                    
                    output = capturedOutput;
                }
                
                // If no output, try to get the result of the last expression
                if (!output.trim() && !hasPlot) {
                    try {
                        const result = await py.runPython(`
import ast

# Parse the code to find the last expression
try:
    tree = ast.parse(__user_code__)
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        # Last statement is an expression, evaluate it
        result = eval(compile(ast.Expression(tree.body[-1].value), '<string>', 'eval'))
        if result is not None:
            str(result)
        else:
            ""
    else:
        ""
except:
    ""
                        `);
                        if (result) output = result;
                    } catch (evalError) {
                        // Ignore evaluation errors for expressions
                    }
                }

            } catch (executionError) {
                // Stop capturing output to get any partial output
                let capturedOutput = '';
                try {
                    capturedOutput = await py.runPython('_output_capture.stop_capture()');
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
                
                // Extract meaningful Python error message
                let errorMessage = executionError.message || String(executionError) || 'Python execution failed';
                
                // Clean up Pyodide wrapper text and extract the actual Python error
                if (errorMessage.includes('PythonError:')) {
                    // Extract everything after "PythonError: "
                    errorMessage = errorMessage.replace(/^.*PythonError:\s*/, '');
                }
                
                // If it's still just "PythonError", try to get more details from the string representation
                if (errorMessage === 'PythonError' || errorMessage.trim() === '') {
                    const fullError = String(executionError);
                    // Look for actual Python error patterns
                    const pythonErrorMatch = fullError.match(/(SyntaxError|NameError|IndentationError|TypeError|ValueError|AttributeError|ImportError|ModuleNotFoundError)[^:]*:.*$/m);
                    if (pythonErrorMatch) {
                        errorMessage = pythonErrorMatch[0];
                    } else {
                        errorMessage = fullError || 'Unknown Python error';
                    }
                }
                
                
                // Handle import errors specifically
                if (errorMessage.includes('ModuleNotFoundError') || errorMessage.includes('ImportError')) {
                    const match = errorMessage.match(/No module named '([^']+)'/);
                    if (match) {
                        const moduleName = match[1];
                        if (['matplotlib', 'numpy', 'pandas'].includes(moduleName)) {
                            errorMessage = `Module '${moduleName}' should be available. Try reloading the page or check the exact import name.`;
                        } else {
                            errorMessage = `Module '${moduleName}' not found. Try installing it with:\n\nimport micropip\nawait micropip.install('${moduleName}')`;
                        }
                    }
                }
                
                // Set the error and output for this execution
                error = errorMessage || 'Python execution error';
                output = capturedOutput; // Include any partial output
            }

            
            return { 
                output: output || null, 
                error: error,
                hasPlot: hasPlot,
                plotData: plotData
            };

        } catch (err) {
            let errorMessage = err.message || 'Unknown error';
            return { output: null, error: errorMessage, hasPlot: false, plotData: null };
        }
    }

    // Optional: Warm up Pyodide in the background
    warmUp() {
        if (!this.initPromise && !this.isInitialized) {
            this.initialize().catch(err => {
                console.log('Pre-warm failed, will try again when needed:', err.message);
            });
        }
    }

    // Get initialization status for UI feedback
    getStatus() {
        if (this.isInitialized) return 'ready';
        if (this.initPromise) return 'initializing';
        return 'not-started';
    }
}

// Export singleton instance
export const pyodideService = new PyodideService();