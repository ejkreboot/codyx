<script>
    import webRService from '$lib/classes/webr-service.js';

    let {
        code = '',
        cellIndex = 1,
        executeR = $bindable(),
        clearOutput = $bindable()
    } = $props();

    let output = $state('');
    let error = $state(null);
    let isRunning = $state(false);
    let plots = $state([]);
    let hasPlot = $derived(plots && plots.length > 0);

    function clear() {
        output = '';
        error = null;
        plots = [];
    }

    // Expose functions to parent using bindable
    executeR = runCode;
    clearOutput = clear;

    async function runCode() {
        if (!code.trim()) return;
        
        isRunning = true;
        error = null;
        output = '';
        plots = [];

        try {
            const result = await webRService.executeCode(code);
            
            if (result.error) {
                error = result.error;
                output = null; // Clear output since we're showing it as error
            } else {
                error = null;
                output = result.output;
                plots = result.plots || [];
            }
        } catch (err) {
            error = `R execution failed: ${err.message}`;
            output = '';
            plots = [];
        } finally {
            isRunning = false;
        }
    }

    async function handleKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            await runCode();
        }
    }

    // Auto-initialize WebR when component mounts
    $effect(() => {
        webRService.initialize().catch(console.error);
    });
</script>

<div class="r-area">
    {#if isRunning}
        <div class="r-loading">
            <div class="loading-spinner">
                <span class="material-symbols-outlined spinning">hourglass_empty</span>
            </div>
            <div class="loading-message">
                Executing R code...
            </div>
        </div>
    {/if}

    {#if output || error || hasPlot}
        <div class="output-section">
            {#if error}
                <div class="error-output">
                    <div class="output-label error-label">
                        <span class="material-symbols-outlined">error</span>
                        Error
                    </div>
                    <pre class="output-content error-content">{error}</pre>
                </div>
            {:else if output || hasPlot}
                <div class="success-output">
                    <div class="output-label success-label">
                        <span class="material-symbols-outlined">check_circle</span>
                        Output
                    </div>
                    
                    {#if hasPlot}
                        {#each plots as plotSrc}
                            <div class="plot-output">
                                <img src={plotSrc} alt="R Plot" />
                            </div>
                        {/each}
                    {/if}
                    
                    {#if output}
                        <pre class="output-content success-content text-output">{output}</pre>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @import 'material-symbols';

    .r-area {
        margin-top: 0.5rem;
        border-top: 1px solid #e9ecef;
        background: #fafbfc;
    }

    .r-loading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: #fff8e1;
        border: 1px solid #ffcc02;
        border-radius: 4px;
        margin: 0.5rem;
        color: #e65100;
    }

    .loading-spinner .material-symbols-outlined {
        font-size: 18px;
        color: #e65100;
    }

    .loading-message {
        font-family: 'Raleway', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #e65100;
    }

    .spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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

    .plot-output {
        margin-bottom: 1rem;
        text-align: center;
        padding: 1rem 0;
    }

    .plot-output img {
        max-width: 600px;
        width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        background: white;
        padding: 0.5rem;
        border: 1px solid #e9ecef;
    }

    .text-output {
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: inherit;
        line-height: inherit;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>