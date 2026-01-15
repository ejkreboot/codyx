import { loadPyodide } from 'pyodide';

/**
 * Python runtime service using Pyodide WebAssembly
 * 
 * Manages Python code execution in the browser via Pyodide. Handles package
 * installation, variable tracking, import suggestions, and provides a complete
 * Python environment without server dependencies.
 * 
 * @class PyodideService
 * @example
 * // Initialize Python environment
 * const pyodide = new PyodideService();
 * await pyodide.initialize();
 * 
 * // Execute Python code
 * const result = await pyodide.runPython('print("Hello from Python!")');
 * console.log(result.output); // "Hello from Python!"
 * 
 * // Install packages
 * await pyodide.installPackage('numpy');
 * 
 * // Get available variables for syntax highlighting
 * const variables = pyodide.getGlobalVariables();
 * console.log(variables); // { 'numpy': {...}, ... }
 */
class PyodideService {
    /**
     * Create a new PyodideService instance
     * Initializes the Python runtime manager with empty state
     */
    constructor() {
        this.pyodide = null;
        this.initPromise = null;
        this.isInitialized = false;
        this.globalVariables = {};
        this.variableCallbacks = new Set();
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
                
                # Function to get user-defined variables
                def get_user_variables():
                    """Get user-defined variables with their types and values"""
                    import builtins
                    import types
                    import sys
                    
                    user_vars = {}
                    
                    try:
                        # Get current globals - avoid creating dict() which might cause JsProxy issues
                        current_globals = globals()
                        
                        # Built-in names to exclude
                        try:
                            builtin_names = set(dir(builtins))
                        except:
                            builtin_names = set()
                            
                        system_names = {
                            '__name__', '__doc__', '__package__', '__loader__', '__spec__',
                            '__annotations__', '__builtins__', '__file__', '__cached__',
                            'sys', 'traceback', 'StringIO', 'OutputCapture', '_output_capture',
                            '_matplotlib_loaded', '_matplotlib_loading', 'ensure_matplotlib',
                            'capture_matplotlib', 'capture_plotly', 'get_user_variables',
                            'plt', 'base64', 'BytesIO', '__user_code__', 'builtins', 'types'
                        }
                        
                        # Very defensive iteration over globals
                        try:
                            # Get keys as a list very carefully
                            keys_to_check = []
                            for key in current_globals:
                                try:
                                    # Ensure key is a string and safe to use
                                    if isinstance(key, str) and key not in system_names:
                                        keys_to_check.append(key)
                                except:
                                    continue
                        except:
                            # If we can't iterate, return empty
                            return {}
                        
                        # Process each key safely
                        for name in keys_to_check:
                            try:
                                # Skip system variables and built-ins
                                if (name.startswith('_') or 
                                    name in builtin_names or 
                                    name in system_names):
                                    continue
                                
                                # Get value very safely
                                try:
                                    value = current_globals[name]
                                except:
                                    continue
                                    
                                if value is None:
                                    continue
                                
                                # Skip modules and functions
                                try:
                                    if (isinstance(value, types.ModuleType) or
                                        callable(value)):
                                        continue
                                except:
                                    continue
                                
                                # Get type very safely
                                try:
                                    var_type = type(value).__name__
                                    # Skip problematic types immediately
                                    if var_type in ['JsProxy', 'JsMethod', 'JsBuffer', 'JsException']:
                                        continue
                                except:
                                    continue
                                
                                # Get string representation very safely
                                try:
                                    str_value = str(value)
                                    if len(str_value) > 100:
                                        str_value = str_value[:97] + '...'
                                    elif '\\n' in str_value:
                                        lines = str_value.split('\\n')
                                        str_value = lines[0] + ('...' if len(lines) > 1 else '')
                                except:
                                    str_value = f"<{var_type} object>"
                                
                                # Only add if we have valid string name
                                if isinstance(name, str) and name:
                                    user_vars[name] = {
                                        'type': var_type,
                                        'value': str_value
                                    }
                                
                            except Exception as e:
                                # Skip any variable that causes any error
                                continue
                        
                    except Exception as e:
                        # Return empty dict if there's any global error
                        return {}
                    
                    return user_vars
                
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
        // Store the user code in Python for exec()
        py.globals.set('__user_code__', code);
        
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
                if (onProgress) onProgress('📊 Loading matplotlib for plotting support...');
                await py.runPythonAsync('await ensure_matplotlib()');
                if (onProgress) onProgress('✅ Matplotlib ready - executing your code...');
            }
            
            // Check for micropip installations and provide progress feedback
            const hasMicropipInstall = /micropip\.install/.test(code);
            if (hasMicropipInstall && onProgress) {
                const packages = this._extractPackageNames(code);
                if (packages.length === 1) {
                    onProgress(`📦 Installing ${packages[0]}...`);
                } else if (packages.length > 1) {
                    onProgress(`📦 Installing ${packages.join(', ')}...`);
                } else {
                    onProgress('📦 Installing packages...');
                }
            }
            
            // Check if code contains top-level await
            const hasAwait = /^(?![\s]*#).*\bawait\s+/m.test(code);
            
            // Execute code with proper traceback capture
            // Using exec(compile(...)) gives us clean tracebacks with correct line numbers
            const executionWrapper = `
import traceback
import sys

__execution_error__ = None
__execution_traceback__ = None
__execution_result__ = None

try:
    # Compile first to catch syntax errors with proper locations
    __compiled_code__ = compile(__user_code__, '<user_code>', 'exec')
    ${hasAwait ? 'await eval(__compiled_code__)' : 'exec(__compiled_code__, globals())'}
except SyntaxError as e:
    # SyntaxError needs special formatting - it has lineno, offset, text attributes
    import traceback
    __execution_error__ = f"{type(e).__name__}: {e.msg}"
    # Build a cleaner syntax error message
    lines = []
    if e.lineno:
        lines.append(f"  Line {e.lineno}")
        if e.text:
            lines.append(f"    {e.text.rstrip()}")
            if e.offset:
                lines.append(f"    {' ' * (e.offset - 1)}^")
    lines.append(f"{type(e).__name__}: {e.msg}")
    __execution_traceback__ = "\\n".join(lines)
except Exception as e:
    __execution_error__ = f"{type(e).__name__}: {e}"
    # Get the full traceback, but filter out our wrapper frames
    tb_lines = traceback.format_exception(type(e), e, e.__traceback__)
    # Filter out frames from our execution wrapper
    filtered_lines = []
    skip_next = False
    for line in tb_lines:
        # Skip frames that reference our internal execution
        if '<string>' in line or '<exec>' in line or 'exec(__compiled_code__' in line or 'compile(__user_code__' in line:
            skip_next = True
            continue
        if skip_next and line.startswith('    '):
            continue
        skip_next = False
        filtered_lines.append(line)
    __execution_traceback__ = ''.join(filtered_lines)
`;
            
            if (hasAwait) {
                await py.runPythonAsync(executionWrapper);
            } else {
                await py.runPython(executionWrapper);
            }
            
            // Check if there was an execution error
            const executionError = py.globals.get('__execution_error__');
            const executionTraceback = py.globals.get('__execution_traceback__');
            
            // Stop capturing output
            const capturedOutput = await py.runPython('_output_capture.stop_capture()');
            
            // Clean up tracking variables
            await py.runPython(`
__execution_error__ = None
__execution_traceback__ = None
__compiled_code__ = None
`);
            
            if (executionError) {
                // We have an error - use the full traceback
                error = executionTraceback || executionError;
                output = capturedOutput || ''; // Include any output before the error
            } else {
                // Success - capture any matplotlib plots
                const plotOutput = await py.runPython('capture_matplotlib()');
                
                if (plotOutput && plotOutput.includes('__MATPLOTLIB_IMG__')) {
                    hasPlot = true;
                    plotData = plotOutput.replace('__MATPLOTLIB_IMG__', '').replace('__END_IMG__', '');
                }
                
                output = capturedOutput;
                
                // If no output, try to get the result of the last expression
                if (!output.trim() && !hasPlot) {
                    output = await this._getLastExpressionResult(py, code);
                }
            }

        } catch (executionError) {
            // This catches errors in our wrapper itself (rare, but possible)
            try {
                output = await py.runPython('_output_capture.stop_capture()');
            } catch (e) {
                // Ignore cleanup errors
            }
            
            error = this._formatPyodideError(executionError);
        }

        // Get user variables after execution
        const userVariables = await this._safeGetUserVariables(py);
        this.updateGlobalVariables(userVariables);
        
        return { 
            output: output || null, 
            error,
            hasPlot,
            plotData,
            userVariables
        };

    } catch (err) {
        const userVariables = await this._safeGetUserVariables(py);
        this.updateGlobalVariables(userVariables);
        
        return { 
            output: null, 
            error: this._formatPyodideError(err), 
            hasPlot: false, 
            plotData: null,
            userVariables
        };
    }
}

// Helper: Extract package names from micropip.install calls
_extractPackageNames(code) {
    let packages = [];
    
    // Single package: micropip.install('package')
    const singleMatches = code.matchAll(/micropip\.install\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of singleMatches) {
        packages.push(match[1]);
    }
    
    // Array format: micropip.install(['pkg1', 'pkg2'])
    const arrayMatches = code.matchAll(/micropip\.install\s*\(\s*\[([^\]]+)\]\s*\)/g);
    for (const match of arrayMatches) {
        const arrayPackages = match[1].split(',')
            .map(pkg => pkg.trim().replace(/['"`]/g, ''))
            .filter(Boolean);
        packages.push(...arrayPackages);
    }
    
    return [...new Set(packages)];
}

// Helper: Safely get user variables without throwing
async _safeGetUserVariables(py) {
    try {
        const varResult = await py.runPython('get_user_variables()');
        if (varResult && typeof varResult === 'object') {
            return varResult.toJs ? varResult.toJs() : varResult;
        }
    } catch (e) {
        // Ignore errors
    }
    return {};
}

// Helper: Try to get the result of the last expression
async _getLastExpressionResult(py, code) {
    try {
        py.globals.set('__user_code__', code);
        const result = await py.runPython(`
import ast
try:
    tree = ast.parse(__user_code__)
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        result = eval(compile(ast.Expression(tree.body[-1].value), '<user_code>', 'eval'))
        str(result) if result is not None else ""
    else:
        ""
except:
    ""
`);
        return result || '';
    } catch (e) {
        return '';
    }
}

// Helper: Format Pyodide/JS errors into readable messages
_formatPyodideError(err) {
    const rawError = err.message || String(err);
    
    // Already has a traceback
    if (rawError.includes('Traceback (most recent call last)')) {
        return rawError;
    }
    
    // Extract from PythonError wrapper
    if (rawError.includes('PythonError:')) {
        return rawError.split('PythonError:').pop().trim();
    }
    
    // Try to find a Python exception pattern
    const pythonErrorMatch = rawError.match(/(SyntaxError|NameError|IndentationError|TypeError|ValueError|AttributeError|ImportError|ModuleNotFoundError|KeyError|IndexError|ZeroDivisionError|RuntimeError|RecursionError|StopIteration|FileNotFoundError|PermissionError|OSError)[^\n]*(?:\n.*)?/m);
    if (pythonErrorMatch) {
        return pythonErrorMatch[0];
    }
    
    // Handle specific known issues
    if (rawError.includes('RecursionError') || rawError.includes('maximum recursion depth')) {
        return `RecursionError: maximum recursion depth exceeded\n\n💡 Tip: Click "🧹 Reset" to restart the Python environment.`;
    }
    
    if (rawError.includes('ModuleNotFoundError') || rawError.includes('No module named')) {
        const match = rawError.match(/No module named '([^']+)'/);
        if (match) {
            return `ModuleNotFoundError: No module named '${match[1]}'\n\n💡 Try:\nimport micropip\nawait micropip.install('${match[1]}')`;
        }
    }
    
    return rawError || 'Python execution error';
}

    // Get current user-defined variables
    async getUserVariables() {
        const py = await this.initialize();
        if (!py) {
            return {};
        }

        try {
            const varResult = await py.runPython('get_user_variables()');
            if (varResult && typeof varResult === 'object') {
                return varResult.toJs ? varResult.toJs() : varResult;
            } else {
                return {};
            }
        } catch (error) {
            return {};
        }
    }

    // Subscribe to variable changes
    subscribeToVariables(callback) {
        this.variableCallbacks.add(callback);
        // Immediately call with current variables
        callback(this.globalVariables);
        
        // Return unsubscribe function
        return () => {
            this.variableCallbacks.delete(callback);
        };
    }

    // Update global variables and notify subscribers
    updateGlobalVariables(variables) {
        this.globalVariables = variables || {};
        // Notify all subscribers
        this.variableCallbacks.forEach(callback => {
            try {
                callback(this.globalVariables);
            } catch (error) {
                console.error('Error in variable callback:', error);
            }
        });
    }

    // Get current global variables
    getGlobalVariables() {
        return this.globalVariables;
    }

    // Manual cleanup method for users - NUCLEAR RESET
    async resetEnvironment() {
        
        try {
            // Completely destroy the current Pyodide instance
            this.pyodide = null;
            this.isInitialized = false;
            this.initPromise = null;
            
            // Clear global variables and notify subscribers
            this.updateGlobalVariables({});
            
            // Force garbage collection to clean up memory
            if (typeof window !== 'undefined' && window.gc) {
                window.gc();
            }
            
            
            // Reinitialize from scratch (like a fresh page load)
            await this.initialize();
            
            return { 
                error: null, 
                hasPlot: false, 
                plotData: null 
            };
            
        } catch (error) {
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
        return;
        // Do nothing - nuclear reset is the preferred method now
    }
    
    // Get initialization status for UI feedback
    // Memory cleanup method
    async cleanup() {
        if (this.pyodide) {
            try {
                // Just destroy the engine completely
                this.pyodide = null;
                this.isInitialized = false;
                this.initPromise = null;
            } catch (error) {
                return;
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