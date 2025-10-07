<script>
    import { onMount, onDestroy } from 'svelte';
    import { pyodideService } from '$lib/classes/pyodide-service.js';

    let { 
        code = '', 
        cellId = '', 
        executePython = $bindable(),
        clearOutput = $bindable() 
    } = $props();

    let isLoading = $state(false);
    let isExecuting = $state(false);
    let progressMessage = $state('');
    let output = $state('');
    let error = $state(null);
    let hasPlot = $state(false);
    let plotData = $state(null);
    let hasRun = $state(false);

    // Expose functions to parent using bindable
    executePython = execute;
    clearOutput = clear;

    // Execute Python code using shared service
    async function execute() {
        if (!code.trim()) return;
                
        isExecuting = true;
        error = null;
        output = '';
        hasPlot = false;
        plotData = null;
        progressMessage = '';
        
        // Show loading state if Pyodide is initializing for the first time
        const status = pyodideService.getStatus();
        if (status === 'not-started') {
            isLoading = true;
        }
        
        try {
            // Progress callback to update user with installation status
            const onProgress = (message) => {
                progressMessage = message;
            };
            
            const result = await pyodideService.executeCode(code, onProgress);
            
            // If error is "PythonError" but we have output, treat output as the error
            if (result.error === "PythonError" && result.output) {
                // Clean up the traceback by removing noisy lines
                const lines = result.output.split('\n');
                const cleanedLines = lines.filter(line => {
                    const trimmed = line.trim();
                    // Remove File references, eval_code, and .run lines
                    if (trimmed.match(/^\s*File\s+/)) return false;
                    if (trimmed.includes('eval_code')) return false;
                    if (trimmed.match(/^\s*\.run/)) return false;
                    if (trimmed.match(/^\s*coroutine\s*=/)) return false;
                    if (trimmed.match(/^\s*~~~\^\^\^\^\^\^\^\^\^\^\^\^\^\^\^\^\^/)) return false;
                    // Keep everything else
                    return true;
                });
                
                error = cleanedLines.join('\n').trim();
                output = null; // Clear output since we're showing it as error
                hasPlot = false;
                plotData = null;
            } else {
                output = result.output;
                error = result.error;
                hasPlot = result.hasPlot;
                plotData = result.plotData;
            }
            
            hasRun = true;
            
        } catch (err) {
            error = err.message || String(err);
            output = '';
            hasPlot = false;
            plotData = null;
            hasRun = true;
        } finally {
            isExecuting = false;
            isLoading = false;
            progressMessage = '';
        }
    }

    function clear() {
        output = '';
        error = null;
        hasPlot = false;
        plotData = null;
        hasRun = false;
    }

    // Reset Python environment (clear all variables and imports)
    async function resetEnvironment() {
        isExecuting = true;
        try {
            const result = await pyodideService.resetEnvironment();
            output = result.output;
            error = result.error;
            hasPlot = result.hasPlot;
            plotData = result.plotData;
            hasRun = true;
        } catch (err) {
            error = err.message || String(err);
            output = '';
            hasPlot = false;
            plotData = null;
            hasRun = true;
        } finally {
            isExecuting = false;
        }
    }

    // Handle keyboard shortcuts
    function handleKeydown(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            execute();
        }
    }

    onMount(() => {
        // Optionally pre-load Pyodide in the background
        // initPyodide();
    });

    onDestroy(() => {
        isExecuting = false;
        isLoading = false;
        progressMessage = '';
        
        output = '';
        error = null;
        hasPlot = false;
        plotData = null;
        
    });
</script>

<div class="python-area">
    {#if isExecuting && progressMessage}
        <div class="progress-section">
            <div class="progress-content">
                <span class="progress-text">{progressMessage}</span>
            </div>
        </div>
    {/if}

    {#if output || error || hasPlot}
        <div class="output-section">
            {#if error}
                <div class="error-output">
                    <div class="output-label error-label">
                        <span class="material-symbols-outlined">error</span>
                        Error:
                        <button 
                            class="reset-btn" 
                            onclick={resetEnvironment}
                            title="Nuclear Reset: Completely restart Python engine (like reloading the page)"
                        >
                            🔥 Restart Python
                        </button>
                    </div>
                    <pre class="output-content error-content">{error}</pre>
                </div>
            {:else if output || hasPlot}
                <div class="success-output">
                    <div class="output-label success-label">
                        <span class="material-symbols-outlined">terminal</span>
                        Output:
                        <button 
                            class="reset-btn" 
                            onclick={resetEnvironment}
                            title="Nuclear Reset: Completely restart Python engine (like reloading the page)"
                        >
                            🔥 Restart Python
                        </button>
                    </div>
                    <div class="output-content success-content">
                        {#if hasPlot && plotData}
                            <div class="plot-output">
                                <img src="data:image/png;base64,{plotData}" alt="Plot output" />
                            </div>
                        {/if}
                        {#if output}
                            <pre class="text-output">{output}</pre>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @import 'material-symbols';

    .python-area {
        margin-top: 0.5rem;
        border-top: 1px solid #e9ecef;
        background: #fafbfc;
    }

    .progress-section {
        background: #e3f2fd;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
        margin: 0.5rem;
        animation: pulse 2s infinite;
    }

    .progress-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        font-family: 'Raleway', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #1976d2;
    }

    .progress-text {
        flex: 1;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .output-section {
        border-radius: 4px;
        overflow: hidden;
    }

    .success-output,
    .error-output {
        margin: 0;
    }

    .output-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-family: 'Raleway', sans-serif;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .reset-btn {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: none;
        letter-spacing: normal;
    }

    .reset-btn:hover {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(0, 0, 0, 0.2);
        transform: translateY(-1px);
    }

    .success-label {
        background: #e8f5e8;
        color: #2d5a2d;
        border-bottom: 1px solid #c3e6c3;
    }

    .error-label {
        background: #fdf2f2;
        color: #c53030;
        border-bottom: 1px solid #feb2b2;
    }

    .output-label .material-symbols-outlined {
        font-size: 14px;
    }

    .output-content {
        margin: 0;
        padding: 1rem;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-x: auto;
    }

    .success-content {
        background: #f8fff8;
        color: #2d5a2d;
        border-bottom: 1px solid #e8f5e8;
    }

    .error-content {
        background: #fffafa;
        color: #c53030;
        border-bottom: 1px solid #fdf2f2;
    }

    .plot-output {
        margin-bottom: 1rem;
        text-align: center;
        padding: 1rem 0;
    }

    .plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        background: white;
        padding: 0.5rem;
        border: 1px solid #e9ecef;
    }

    .text-output {
        margin: 0;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
</style>
