<script>
    import { onMount, onDestroy } from 'svelte';
    import { pyodideService } from './pyodide-service.js';

    let { code = '', cellId = '', executePython = null, clearOutput = null } = $props();

    let isLoading = $state(false);
    let isExecuting = $state(false);
    let output = $state('');
    let error = $state(null);
    let hasRun = $state(false);

    // Expose functions to parent
    if (executePython) executePython.value = execute;
    if (clearOutput) clearOutput.value = clear;

    // Execute Python code using shared service
    async function execute() {
        if (!code.trim()) return;
        
        isExecuting = true;
        error = null;
        output = '';
        
        // Show loading state if Pyodide is initializing for the first time
        const status = pyodideService.getStatus();
        if (status === 'not-started') {
            isLoading = true;
        }
        
        try {
            const result = await pyodideService.executeCode(code);
            output = result;
            hasRun = true;
            
        } catch (err) {
            console.log('Python execution error:', err);
            error = err.message || String(err);
            output = ''; // Clear output when there's an error
            hasRun = true;
        } finally {
            isExecuting = false;
            isLoading = false;
        }
    }

    function clear() {
        output = '';
        error = null;
        hasRun = false;
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
        // Cleanup if needed
    });
</script>

<div class="python-area">

    {#if output || error}
        <div class="output-section">
            {#if error}
                <div class="error-output">
                    <div class="output-label error-label">
                        <span class="material-symbols-outlined">error</span>
                        Error:
                    </div>
                    <pre class="output-content error-content">{error}</pre>
                </div>
            {/if}
            
            {#if output}
                <div class="success-output">
                    <div class="output-label success-label">
                        <span class="material-symbols-outlined">terminal</span>
                        Output:
                    </div>
                    <pre class="output-content success-content">{output}</pre>
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





    .output-section {
        max-height: 400px;
        overflow-y: auto;
    }

    .success-output,
    .error-output {
        margin: 0;
    }

    .output-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-family: 'Raleway', sans-serif;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
</style>
