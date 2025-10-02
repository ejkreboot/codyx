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
            console.log('🐍 Initializing Pyodide (this may take a moment)...');
            
            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/"
            });
            
            // Set up global output capture system
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
            `);
            
            this.isInitialized = true;
            console.log('✅ Pyodide initialized successfully!');
            
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
            
            // Execute user code with error handling wrapper
            const result = await py.runPython(`
try:
    exec(${JSON.stringify(code)})
except Exception as e:
    import traceback
    error_details = traceback.format_exc()
    print("PYODIDE_ERROR_START")
    print(error_details)
    print("PYODIDE_ERROR_END")
    raise e
            `);
            
            // Stop capturing and get output
            const capturedOutput = await py.runPython('_output_capture.stop_capture()');
            
            // Combine captured output with result
            let finalOutput = capturedOutput;
            if (result !== undefined && result !== null) {
                if (finalOutput) finalOutput += '\n';
                finalOutput += String(result);
            }
            
            return finalOutput || '(no output)';
            
        } catch (error) {
            // Get any captured output which might contain our error details
            let capturedOutput = '';
            try {
                capturedOutput = await py.runPython('_output_capture.stop_capture()');
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            
            // Look for our formatted error in the captured output
            const errorStart = capturedOutput.indexOf('PYODIDE_ERROR_START');
            const errorEnd = capturedOutput.indexOf('PYODIDE_ERROR_END');
            
            let errorMessage = error.message || String(error);
            if (errorStart !== -1 && errorEnd !== -1) {
                // Extract the detailed traceback
                const startPos = errorStart + 'PYODIDE_ERROR_START\n'.length;
                const rawError = capturedOutput.substring(startPos, errorEnd).trim();
                
                // Clean up the error message by removing File lines
                const lines = rawError.split('\n');
                const cleanedLines = lines.filter(line => !line.trim().match(/^\s*File\s+/));
                errorMessage = cleanedLines.join('\n').trim();
            }
            
            // Create a new error with detailed message
            const detailedError = new Error(errorMessage);
            detailedError.originalError = error;
            throw detailedError;
        }
    }

    // Optional: Warm up Pyodide in the background
    warmUp() {
        if (!this.initPromise && !this.isInitialized) {
            console.log('🔥 Pre-warming Pyodide...');
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