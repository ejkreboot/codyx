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
            
            // Load only essential packages for fast startup
            await this.pyodide.loadPackage(['micropip']);
            
            // Set up global output capture system with lazy matplotlib loading
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
                
                # Global flag to track matplotlib loading state
                _matplotlib_loaded = False
                _matplotlib_loading = False
                
                async def ensure_matplotlib():
                    """Lazy load matplotlib only when needed"""
                    global _matplotlib_loaded, _matplotlib_loading
                    
                    if _matplotlib_loaded:
                        return True
                    
                    if _matplotlib_loading:
                        # Wait for ongoing load to complete
                        import asyncio
                        while _matplotlib_loading:
                            await asyncio.sleep(0.1)
                        return _matplotlib_loaded
                    
                    try:
                        _matplotlib_loading = True
                        print("📦 Loading matplotlib for plotting support...")
                        
                        # Check if matplotlib is already imported
                        if 'matplotlib' not in sys.modules:
                            import micropip
                            await micropip.install('matplotlib')
                        
                        import matplotlib
                        matplotlib.use('Agg')  # Use non-interactive backend
                        import matplotlib.pyplot as plt
                        import base64
                        from io import BytesIO
                        import warnings
                        
                        # Suppress the non-interactive backend warning
                        warnings.filterwarnings('ignore', message='.*non-interactive.*', category=UserWarning)
                        
                        # Store in globals for capture function
                        globals()['plt'] = plt
                        globals()['base64'] = base64
                        globals()['BytesIO'] = BytesIO
                        
                        _matplotlib_loaded = True
                        print("✅ Matplotlib ready for plotting!")
                        return True
                        
                    except Exception as e:
                        print(f"❌ Failed to load matplotlib: {e}")
                        return False
                    finally:
                        _matplotlib_loading = False
                
                def capture_matplotlib():
                    """Capture current matplotlib figure as base64 image"""
                    if not _matplotlib_loaded:
                        return ""
                    
                    try:
                        plt = globals().get('plt')
                        if plt and plt.get_fignums():  # Check if there are active figures
                            BytesIO = globals().get('BytesIO')
                            base64 = globals().get('base64')
                            
                            buf = BytesIO()
                            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                            buf.seek(0)
                            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                            plt.close('all')  # Close all figures
                            return f"__MATPLOTLIB_IMG__{img_base64}__END_IMG__"
                    except Exception as e:
                        print(f"Warning: Failed to capture plot: {e}")
                    
                    return ""
                
                # Alternative: Support for lighter plotting libraries
                def capture_plotly():
                    """Capture Plotly figures if available"""
                    try:
                        import plotly.graph_objects as go
                        import plotly.io as pio
                        # Note: Plotly generates HTML/JS, not images
                        # This would need different handling in the UI
                        return ""
                    except ImportError:
                        return ""
                
                # Check what's available
                import sys
                print(f"📦 Python {sys.version}")
                
                available_modules = ['micropip']
                for module in ['numpy', 'pandas']:
                    try:
                        __import__(module)
                        available_modules.append(module)
                    except ImportError:
                        pass
                
                print(f"📋 Pre-loaded modules: {available_modules}")
                print("✅ Ready for Python code execution!")
                print("💡 Tip: Import any package and get auto-install prompts from 250+ Pyodide packages!")
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

    async executeCode(code, onProgress = null) {
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
                
                // Check if code uses matplotlib and auto-load if needed
                const usesMatplotlib = /\b(matplotlib|plt\.|pyplot)\b/.test(code) || 
                                     /\bfrom\s+matplotlib/.test(code) ||
                                     /\bimport\s+matplotlib/.test(code);
                
                if (usesMatplotlib) {
                        if (onProgress) onProgress('📊 Loading matplotlib for plotting support... (first time may take a moment)');
                    await py.runPythonAsync('await ensure_matplotlib()');
                    if (onProgress) onProgress('✅ Matplotlib ready - executing your code...');
                }
                
                // Check for micropip installations and provide progress feedback
                const hasMicropipInstall = /micropip\.install/.test(code);
                if (hasMicropipInstall && onProgress) {
                    // Extract package names from micropip.install calls with better regex
                    let packages = [];
                    
                    // Match single package: micropip.install('package') or micropip.install("package")
                    const singleMatches = code.match(/micropip\.install\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
                    if (singleMatches) {
                        singleMatches.forEach(match => {
                            const pkg = match.match(/['"`]([^'"`]+)['"`]/)[1];
                            packages.push(pkg);
                        });
                    }
                    
                    // Match array format: micropip.install(['pkg1', 'pkg2'])
                    const arrayMatches = code.match(/micropip\.install\s*\(\s*\[([^\]]+)\]\s*\)/g);
                    if (arrayMatches) {
                        arrayMatches.forEach(match => {
                            const arrayContent = match.match(/\[([^\]]+)\]/)[1];
                            const arrayPackages = arrayContent.split(',')
                                .map(pkg => pkg.trim().replace(/['"`]/g, ''))
                                .filter(pkg => pkg);
                            packages = packages.concat(arrayPackages);
                        });
                    }
                    
                    if (packages.length > 0) {
                        const uniquePackages = [...new Set(packages)];
                        if (uniquePackages.length === 1) {
                            onProgress(`📦 Installing ${uniquePackages[0]}... (this may take a moment)`);
                        } else {
                            onProgress(`📦 Installing ${uniquePackages.length} packages: ${uniquePackages.join(', ')}... (this may take a moment)`);
                        }
                    } else {
                        onProgress('📦 Installing packages... (this may take a moment)');
                    }
                }
                
                // Check if code contains await - if so, use runPythonAsync
                const hasAwait = /\bawait\s+/.test(code);
                
                if (hasAwait) {
                    // Execute async code directly using runPythonAsync
                    await py.runPythonAsync(code);
                } else {
                    // Execute regular code using runPython
                    await py.runPython(code);
                }
                
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
                
                // Only clean up on severe errors that might contaminate the environment
                try {
                    const isRecursionError = executionError.message?.includes('RecursionError') || 
                                           executionError.message?.includes('maximum recursion depth') ||
                                           String(executionError).includes('RecursionError');
                    
                    if (isRecursionError) {
                        console.log('🔥 Recursion error detected - suggesting manual reset');
                        // Don't auto-cleanup, let user decide to reset manually
                    }
                } catch (cleanupError) {
                    console.log('⚠️ Error analysis failed:', cleanupError);
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
                
                // Enhanced error messages for specific cases
                if (errorMessage?.includes('RecursionError') || errorMessage?.includes('maximum recursion depth')) {
                    error = `${errorMessage}\n\n💡 Tip: Click the "🧹 Reset" button to completely restart the Python environment.`;
                } else {
                    error = errorMessage || 'Python execution error';
                }
                
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

    // Manual cleanup method for users - NUCLEAR RESET
    async resetEnvironment() {
        console.log('� Nuclear reset: Completely restarting Pyodide engine...');
        
        try {
            // Completely destroy the current Pyodide instance
            this.pyodide = null;
            this.isInitialized = false;
            this.initPromise = null;
            
            // Force garbage collection to clean up memory
            if (typeof window !== 'undefined' && window.gc) {
                window.gc();
            }
            
            console.log('💥 Pyodide engine destroyed - reinitializing...');
            
            // Reinitialize from scratch (like a fresh page load)
            await this.initialize();
            
            return { 
                output: "🔥 Python environment completely restarted. Fresh engine with no previous state.", 
                error: null, 
                hasPlot: false, 
                plotData: null 
            };
            
        } catch (error) {
            console.error('❌ Nuclear reset failed:', error);
            return { 
                output: null, 
                error: `Reset failed: ${error.message}. Try reloading the page.`, 
                hasPlot: false, 
                plotData: null 
            };
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

    // Legacy cleanup method - now deprecated in favor of nuclear reset
    // This method is kept for backwards compatibility but does minimal cleanup
    async cleanNamespace(aggressive = false) {
        console.log('⚠️ cleanNamespace is deprecated - use resetEnvironment() for full reset');
        // Do nothing - nuclear reset is the preferred method now
    }
    
    // Get initialization status for UI feedback
    // Memory cleanup method
    async cleanup() {
        if (this.pyodide) {
            try {
                console.log('🧹 Pyodide service cleanup - destroying engine');
                // Just destroy the engine completely
                this.pyodide = null;
                this.isInitialized = false;
                this.initPromise = null;
                console.log('✅ Pyodide service cleaned up');
            } catch (error) {
                console.log('⚠️ Pyodide cleanup error:', error);
            }
        }
    }

    getStatus() {
        if (this.isInitialized) return 'ready';
        if (this.initPromise) return 'initializing';
        return 'not-started';
    }
}

// Export singleton instance
export const pyodideService = new PyodideService();