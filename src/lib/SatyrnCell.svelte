<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { LiveText } from '$lib/live-text.js';
    import { supabase } from '$lib/supabase-client.js';
    import { marked } from 'marked';
    import PythonArea from './PythonArea.svelte';
    import RArea from './RArea.svelte';
	
    let props = $props();
    let initialText = props.initialText ?? '';
    let type = props.type ?? 'md';
    let docId = props.docId ?? crypto.randomUUID();
    let userId = props.userId ?? null;
    let version = props.version;
    let cellIndex = props.cellIndex ?? 1;

    let text = $state(initialText);
    let typing = $state(false);
    let isEditing = $state(false);
    let isDirty = $state(false);
    
    // Python execution function bindings
    let pythonExecute = $state(null);
    let pythonClear = $state(null);
    
    // R execution function bindings
    let rExecute = $state(null);
    let rClear = $state(null);

    let liveText;
    let textareaElement = $state();

    const dispatch = createEventDispatcher();

    // svelte-ignore non_reactive_update
    let handleInput = () => {};


    function onPatched(e) { 
        text = e.detail.text;
    }   

    function onTyping(e) { 
        typing = e.detail.typing; 
    }

    function startEditing() {
        isEditing = true;
    }

    function stopEditing() {
        isEditing = false;
        dispatch('edit', { type: "edit", docId, text });
    }

    function moveUp() {
        dispatch('moveUp', {  docId });
    }

    function moveDown() {
        dispatch('moveDown', { docId });
    }

    function deleteCell() {
        dispatch('delete', {  docId });
    }

    function addMarkdownCell() {
        dispatch('addCell', {  docId, cellType: 'md' });
    }

    function addCodeCell() {
        dispatch('addCell', {  docId, cellType: 'code' });
    }

    function addRCell() {
        dispatch('addCell', {  docId, cellType: 'r' });
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            startEditing();
        }
    }
    
    onMount(async() => {
        liveText = await LiveText.create({text: initialText, docId, supabase, userId, version});
        liveText.addEventListener('patched', onPatched);
        liveText.addEventListener('typing', onTyping);
        handleInput = (e) => {
            liveText.update(e.target.value);
        };
    });

    onDestroy(() => {
      liveText?.removeEventListener('patched', onPatched);
      liveText?.removeEventListener('typing', onTyping);
      liveText?.destroy();
    });
</script>

<div class="cell-container" data-cell-type={type}>
  <div class="cell-gutter">
    <div class="cell-type-icon">
      {#if type === 'r'}
        <span class="r-symbol"></span>
      {:else if type === 'code'}
        <span class="python-symbol"></span>
      {:else}
        <span class="material-symbols-outlined">markdown</span>
      {/if}
    </div>
    <div class="cell-index">
      [{cellIndex}]
    </div>
  </div>
  
  <div class="cell-content">
    <div class="toolbar">
      <button class="toolbar-btn" onclick={moveUp} title="Move Up">
        <span class="material-symbols-outlined">keyboard_arrow_up</span>
      </button>
      <button class="toolbar-btn" onclick={moveDown} title="Move Down">
        <span class="material-symbols-outlined">keyboard_arrow_down</span>
      </button>
      <button class="toolbar-btn" onclick={addMarkdownCell} title="Add Markdown Cell">
        <span class="material-symbols-outlined">markdown</span>
      </button>
      <button class="toolbar-btn" onclick={addCodeCell} title="Add Python Cell">
        <span class="python-symbol"></span>
      </button>
      <button class="toolbar-btn" onclick={addRCell} title="Add R Cell">
        <span class="r-symbol"></span>
      </button>
      <button class="toolbar-btn delete-btn" onclick={deleteCell} title="Delete Cell">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>

    {#if type === 'md'}
      {#if isEditing}
        <textarea 
          bind:this={textareaElement}
          bind:value={text} 
          oninput={handleInput}
          onblur={stopEditing}
          class="cell-textarea"
          placeholder="Enter markdown..."
        ></textarea>
        <div class="markdown-preview">
          <div class="rendered-markdown">
            {@html marked(text)}
          </div>
        </div>
      {:else}
        <div class="rendered-markdown" onclick={startEditing} onkeydown={handleKeydown} role="button" tabindex="0">
          {@html marked(text)}
        </div>
      {/if}
    {/if}
    
    {#if type === 'code'}
      <div class="code-cell-content">
        <div class="code-gutter">
          <button 
            class="gutter-btn run-btn" 
            onclick={() => pythonExecute?.()}
            title="Run Python code (Ctrl/Cmd + Enter)"
          >
            <span class="material-symbols-outlined">play_circle</span>
          </button>
          
          <button 
            class="gutter-btn clear-btn"
            onclick={() => pythonClear?.value?.()}
            title="Clear output"
          >
            <span class="material-symbols-outlined">clear</span>
          </button>
        </div>
        
        <div class="code-cell-main">
          <textarea 
            bind:this={textareaElement}
            bind:value={text} 
            oninput={handleInput}
            onblur={stopEditing}
            class="cell-textarea"
          ></textarea>
          
          <PythonArea 
            code={text}
            cellId={docId}
            bind:executePython={pythonExecute}
            bind:clearOutput={pythonClear}
          />
        </div>
      </div>
    {/if}
    
    {#if type === 'r'}
      <div class="code-cell-content">
        <div class="code-gutter">
          <button 
            class="gutter-btn run-btn" 
            onclick={() => rExecute?.()}
            title="Run R code (Ctrl/Cmd + Enter)"
          >
            <span class="material-symbols-outlined">play_circle</span>
          </button>
          
          <button 
            class="gutter-btn clear-btn"
            onclick={() => rClear?.()}
            title="Clear output"
          >
            <span class="material-symbols-outlined">clear</span>
          </button>
        </div>
        
        <div class="code-cell-main">
          <textarea 
            bind:this={textareaElement}
            bind:value={text} 
            oninput={handleInput}
            onblur={stopEditing}
            class="cell-textarea"
          ></textarea>
          
          <RArea 
            code={text}
            cellIndex={cellIndex}
            bind:executeR={rExecute}
            bind:clearOutput={rClear}
          />
        </div>
      </div>
    {/if}
    
    {#if typing}
      <div class="typing-indicator" aria-live="polite">Typing…</div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Cutive+Mono&display=swap');
  @import 'material-symbols';

  :root {
    --color-accent-1: #ffa000;
    --color-accent-2: #0095f2;
  }

  .cell-container {
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    overflow: hidden;
    background: white;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    display: flex;
  }

  .cell-gutter {
    width: 36px;
    background: #f8f9fa;
    border-right: 1px solid #e9ecef;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    gap: 6px;
    flex-shrink: 0;
  }

  .cell-type-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell-type-icon .material-symbols-outlined {
    font-size: 18px;
  }

  /* Color code symbols with custom colors */
  .cell-container[data-cell-type="code"] .cell-type-icon {
    color: #f6ce35; /* Python Gold */
  }

  .cell-container[data-cell-type="md"] .cell-type-icon {
    color: var(--color-accent-2);
  }

  .cell-container[data-cell-type="r"] .cell-type-icon {
    color: #054ba4; /* R Blue */
  }

  /* Size adjustments for custom symbols */
  .cell-container .r-symbol,
  .cell-container .python-symbol {
    font-size: 14px;
  }

  .cell-index {
    font-family: 'Cutive Mono', monospace;
    font-size: 11px;
    color: #888;
    font-weight: 600;
    text-align: center;
    line-height: 1;
  }

  .cell-content {
    flex: 1;
    position: relative;
    min-height: 60px;
  }

  .code-cell-content {
    display: flex;
  }

  .code-gutter {
    width: 36px;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px 8px 4px;
    gap: 6px;
    flex-shrink: 0;
  }

  .code-cell-main {
    flex: 1;
  }

  .gutter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
  }

  .gutter-btn.run-btn {
    color: var(--color-accent-2);
  }

  .gutter-btn.run-btn:hover {
    background: rgba(0, 149, 242, 0.1);
    color: #0085d8;
  }

  .gutter-btn.clear-btn {
    color: var(--color-accent-1);
  }

  .gutter-btn.clear-btn:hover {
    background: rgba(255, 160, 0, 0.1);
    color: #e8900a;
  }

  .gutter-btn .material-symbols-outlined {
    font-size: 18px;
  }

  .toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(85, 89, 88, 0.15);
  }

  .cell-container:hover .toolbar {
    opacity: 1;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #555958;
    transition: all 0.2s ease;
  }

  .toolbar-btn:hover {
    background-color: rgba(0, 149, 242, 0.1);
    color: #0095f2;
  }

  .toolbar-btn.delete-btn:hover {
    background-color: rgba(255, 160, 0, 0.1);
    color: #ffa000;
  }

  .toolbar-btn .material-symbols-outlined {
    font-size: 18px;
    font-weight: 400;
  }

  .cell-textarea {
    width: 100%;
    min-height: 120px;
    padding: 1rem;
    border: none;
    outline: none;
    resize: vertical;
    font-family: 'Cutive Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #555958;
    background: transparent;
    box-sizing: border-box;
  }

  .markdown-preview {
    margin-top: 8px;
    padding: 12px;
    background: #fafbfc;
    border-radius: 4px;
    border: 1px solid #e9ecef;
  }

  .markdown-preview .rendered-markdown {
    cursor: default;
    padding: 0;
    margin: 0;
  }

  .rendered-markdown {
    cursor: pointer;
    padding: 1rem;
    font-family: 'Raleway', sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #555958;
    background: transparent;
    border: none;
    min-height: 120px;
    box-sizing: border-box;
  }

  .rendered-markdown:hover {
    background-color: rgba(0, 149, 242, 0.05);
  }

  .rendered-markdown:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px #0095f2;
  }

  .rendered-markdown :global(h1),
  .rendered-markdown :global(h2),
  .rendered-markdown :global(h3),
  .rendered-markdown :global(h4),
  .rendered-markdown :global(h5),
  .rendered-markdown :global(h6) {
    color: #555958;
    font-weight: 600;
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }

  .rendered-markdown :global(h1) {
    font-size: 2em;
    border-bottom: 2px solid #0095f2;
    padding-bottom: 0.3em;
  }

  .rendered-markdown :global(h2) {
    font-size: 1.5em;
  }

  .rendered-markdown :global(code) {
    background-color: rgba(255, 160, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Cutive Mono', monospace;
    font-size: 0.9em;
  }

  .rendered-markdown :global(pre) {
    background-color: rgba(85, 89, 88, 0.05);
    padding: 1em;
    border-radius: 6px;
    border-left: 4px solid #0095f2;
    overflow-x: auto;
  }

  .rendered-markdown :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .rendered-markdown :global(blockquote) {
    border-left: 4px solid #ffa000;
    margin: 1em 0;
    padding: 0.5em 1em;
    background-color: rgba(255, 160, 0, 0.05);
    font-style: italic;
  }

  .rendered-markdown :global(a) {
    color: #0095f2;
    text-decoration: none;
  }

  .rendered-markdown :global(a:hover) {
    text-decoration: underline;
  }

  .typing-indicator {
    font-size: 0.85rem;
    color: #ffa000;
    font-family: 'Raleway', sans-serif;
    font-style: italic;
    padding: 0.5rem 1rem;
    background-color: rgba(255, 160, 0, 0.1);
  }
</style>
