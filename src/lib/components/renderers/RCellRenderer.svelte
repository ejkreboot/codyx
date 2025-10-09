<script>
    let {
        renderer,
        textareaElement = $bindable(),
        onInput,
        onStartEditing,
        onStopEditing, 
        onKeydown
    } = $props();

    let vars = $state([]);

    // Execute function - run R code
    async function executeR() {
        if (renderer && typeof renderer.execute === 'function') {
            await renderer.execute();
        }
    }

    // Debug function availability
    $effect(() => {
        console.log('RCellRenderer props:', {
            onStartEditing: typeof onStartEditing,
            onStopEditing: typeof onStopEditing,
            onInput: typeof onInput
        });
    });

    async function handleFocus() {
        if (onStartEditing && typeof onStartEditing === 'function') {
            onStartEditing();
        }
        vars = await renderer.getVariables();

    }

    function handleBlur() {
        console.log('handleBlur called, onStopEditing:', typeof onStopEditing);
        if (onStopEditing && typeof onStopEditing === 'function') {
            onStopEditing();
        }
    }

    function handleKeydown(event) {
        if (event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            executeR();
        } else if (onKeydown && typeof onKeydown === 'function') {
            onKeydown(event);
        }
    }
</script>

<div class="r-cell-container">
    <div class="r-input-container">
        <div class="r-sub-gutter">
            <button 
                class="run-btn" 
                onclick={executeR}
                disabled={renderer.isExecuting || !renderer.text.trim()}
                title="Run R code (Shift+Enter)"
            >
                <span class="material-symbols-outlined">
                    {renderer.isExecuting ? 'hourglass_empty' : 'play_arrow'}
                </span>
            </button>
        </div>
        
        <textarea 
            bind:this={textareaElement}
            bind:value={renderer.text}
            oninput={onInput}
            onblur={handleBlur}
            onfocus={handleFocus}
            onkeydown={handleKeydown}
            class="r-textarea"
            placeholder="Enter R code..."
            spellcheck="false"
        ></textarea>
    </div>
    <div>Current vars: {vars.join(', ')}</div>

{#if renderer.output}
    <div class="r-output">
        {#if renderer.output.type === 'text'}
            <pre class="r-text-output">{renderer.output.content}</pre>
            {:else if renderer.output.type === 'plot'}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {:else}
                    <div class="r-plot-output">
                        <img src={renderer.output.content} alt="R Plot" />
                    </div>
                {/if}
            {:else if renderer.output.type === 'mixed'}
                <!-- Mixed output: both text and plots -->
                {#if renderer.output.textContent && renderer.output.textContent.trim()}
                    <pre class="r-text-output">{renderer.output.textContent}</pre>
                {/if}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {/if}
            {:else if renderer.output.type === 'data'}
                <div class="r-data-output">
                    <table class="r-table">
                        <thead>
                            <tr>
                                {#each renderer.output.columns as col}
                                    <th>{col}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each renderer.output.rows as row}
                                <tr>
                                    {#each row as cell}
                                        <td>{cell}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else if renderer.output.type === 'error'}
                <div class="r-error-output">
                    <div class="error-header">
                        <span class="material-symbols-outlined">error</span>
                        R Error
                    </div>
                    <pre class="error-content">{renderer.output.content}</pre>
                </div>
            {/if}
        </div>
    {/if}
    
    {#if renderer.isExecuting}
        <div class="r-executing">
            <span class="material-symbols-outlined spinning">sync</span>
            Executing R code...
        </div>
    {/if}
</div>

<style>
    @import 'material-symbols';
    
    .r-cell-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .r-input-container {
        display: flex;
        align-items: flex-start;
        gap: 0;
    }
    
    .r-sub-gutter {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 40px;
        min-width: 40px;
        padding: 8px 4px;
        background: rgba(255, 255, 255);
        border-right: none;
    }
    
    .r-textarea {
        flex: 1;
        min-height: 80px;
        max-height: 600px;
        padding: 0.75rem 1rem;
        border: none;
        outline: none;
        resize: none;
        overflow-y: auto;
        font-family: 'Cutive Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #555958;
        background: transparent;
        box-sizing: border-box;
        transition: height 0.1s ease;
    }
    
    .r-input-container:focus-within .r-sub-gutter {
        background: rgba(255, 255, 255, 0.08);
        border-right-color: #054ba4;
    }
    
    .r-textarea:focus {
        background-color: rgba(5, 75, 164, 0.03);
    }
    
    .run-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        min-width: 16px;
        height: 16px;
        margin-top: 10px;
        font-family: Material Symbols Outlined;
        line-height: 16px;
        font-size: 12px;
        font-feature-settings: "liga";
        color: var(--color-accent-2);
        background: #f2f2f2;
        border: 1.5px solid var(--color-accent-2);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .run-btn:hover:not(:disabled) {
        background: #043a82;
        box-shadow: 0 2px 6px rgba(5, 75, 164, 0.4);
        transform: scale(1.1);
    }
    
    .run-btn:active:not(:disabled) {
        transform: scale(0.95);
        box-shadow: 0 1px 3px rgba(5, 75, 164, 0.3);
    }
    
    .run-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.6;
    }
    
    .run-btn .material-symbols-outlined {
        font-size: 14px;
    }
    

    
    .r-output {
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
        overflow: hidden;
    }
    
    .r-text-output {
        padding: 1rem;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #495057;
        background: white;
        white-space: pre-wrap;
        overflow-x: auto;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .r-text-output:last-child {
        border-bottom: none;
    }
    
    .r-plot-output {
        padding: 1rem;
        text-align: center;
        background: white;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .r-plot-output:last-child {
        border-bottom: none;
    }
    
    .r-plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .r-data-output {
        padding: 1rem;
        background: white;
        overflow-x: auto;
    }
    
    .r-table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Cutive Mono', monospace;
        font-size: 12px;
    }
    
    .r-table th {
        background: #054ba4;
        color: white;
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
    }
    
    .r-table td {
        padding: 6px 12px;
        border-bottom: 1px solid #dee2e6;
        color: #495057;
    }
    
    .r-table tr:nth-child(even) td {
        background-color: #f8f9fa;
    }
    
    .r-error-output {
        background: #fff5f5;
        border-left: 4px solid #dc3545;
    }
    
    .error-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #f8d7da;
        border-bottom: 1px solid #f5c2c7;
        font-weight: 600;
        color: #721c24;
        font-family: 'Raleway', sans-serif;
    }
    
    .error-header .material-symbols-outlined {
        font-size: 18px;
    }
    
    .error-content {
        padding: 16px;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #721c24;
        background: white;
        white-space: pre-wrap;
    }
    
    .r-executing {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(5, 75, 164, 0.1);
        border-radius: 6px;
        color: #054ba4;
        font-family: 'Raleway', sans-serif;
        font-weight: 500;
        font-size: 14px;
    }
    
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    /* R syntax highlighting hints */
    .r-textarea::placeholder {
        color: #054ba4;
        opacity: 0.6;
    }
</style>