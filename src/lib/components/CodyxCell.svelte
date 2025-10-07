<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { LiveText } from '$lib/classes/live-text.js';
    import { supabase } from '$lib/util/supabase-client.js';
    import { marked } from 'marked';
    import { processEnhancedMarkdown, collapsibleScript } from '$lib/util/enhanced-markdown.js';
    import PythonArea from '$lib/components/PythonArea.svelte';
    import RArea from '$lib/components/RArea.svelte';
    import pyodidePackagesData from '$lib/classes/pyodide-packages.json';
	
    let props = $props();
    let initialText = props.initialText ?? '';
    let type = props.type ?? 'md';
    let docId = props.docId ?? crypto.randomUUID();
    let userId = props.userId ?? null;
    let version = props.version;
    let cellIndex = props.cellIndex ?? 1;
    let sandboxed = props.sandboxed ?? false;

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

    // Import suggestion state
    let importSuggestions = $state([]);
    
    // Create comprehensive package mapping from Pyodide packages
    const createPackageMapping = () => {
        const mapping = {};
        
        // Add all Pyodide packages (most use the same name for import and install)
        pyodidePackagesData.packages.forEach(pkg => {
            mapping[pkg] = pkg;
        });
        
        // Add common import aliases and special cases
        const specialMappings = {
            'sklearn': 'scikit-learn',
            'cv2': 'opencv-python',
            'PIL': 'Pillow', 
            'bs4': 'beautifulsoup4',
            'yaml': 'pyyaml',
            'Image': 'Pillow',  // from PIL import Image
            'requests': 'requests'
        };
        
        // Override with special mappings where import name differs from install name
        Object.assign(mapping, specialMappings);
        
        return mapping;
    };
    
    const commonPackages = createPackageMapping();

    let liveTextUpdater = null;
    
    // Debug: Track text changes
    $effect(() => {
    });
    
    // svelte-ignore non_reactive_update
    function handleInput(e) {
      if (liveTextUpdater) {
          liveTextUpdater(e);
      } else {
        return;
      }
      
      // Auto-resize textarea for code cells (both Python and R)
      if ((type === 'code' || type === 'r') && e.target) {
          autoResizeTextarea(e.target);
      }
      
      // Update import suggestions for Python cells
      if (type === 'code') {
          updateImportSuggestions();
      }
    }
    
    // Auto-resize textarea to fit content
    function autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Set minimum height
        const minHeight = 60; // About 3 lines
        
        // Use different max heights based on cell type
        // R and Python (code) cells often have longer code blocks
        const maxHeight = (type === 'r' || type === 'code') ? 800 : 400;
        
        // Calculate new height based on scroll height
        const newHeight = Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight));
        
        textarea.style.height = newHeight + 'px';
    }
    
    // Detect imports and suggest package installations
    function updateImportSuggestions() {
        if (type !== 'code') {
            importSuggestions = [];
            return;
        }
        
        const suggestions = [];
        const lines = text.split('\n');
        const suggestedPackages = new Set(); // Prevent duplicate suggestions
        
        lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            
            // Skip comments and empty lines
            if (trimmed.startsWith('#') || trimmed === '') {
                return;
            }
            
            // Match various import patterns
            const importPatterns = [
                // Standard imports: import package
                /^import\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
                // From imports: from package import ...
                /^from\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+import/,
                // Multiple imports: import package1, package2
                /^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/,
            ];
            
            for (const pattern of importPatterns) {
                const match = trimmed.match(pattern);
                if (match && match[1]) {
                    // Handle multiple imports separated by commas
                    const packageNames = match[1].split(',').map(name => name.trim());
                    
                    for (const packageName of packageNames) {
                        // Check if it's in our Pyodide packages list
                        if (commonPackages[packageName] && !suggestedPackages.has(packageName)) {
                            // Check if this package is already being installed via micropip
                            const installName = commonPackages[packageName];
                            const isAlreadyInstalling = lines.some(l => {
                                const trimmedLine = l.trim();
                                const installPattern = new RegExp(
                                    `micropip\\.install\\s*\\(\\s*['"\`]${installName}['"\`]\\s*\\)|` +
                                    `micropip\\.install\\s*\\(\\s*\\[.*['"\`]${installName}['"\`].*\\]\\s*\\)`
                                );
                                return installPattern.test(trimmedLine);
                            });
                            
                            // Only suggest if not already installing
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
        
        importSuggestions = suggestions;
    }
    
    // Insert micropip installation code
    function insertInstallCode(suggestion) {
        
        const lines = text.split('\n');
        
        // Check if micropip import already exists
        const hasMicropipImport = lines.some(line => 
            line.trim().match(/^import\s+micropip\s*$/) || 
            line.trim().match(/^from\s+micropip\s+import/)
        );
        
        // Check if this package is already being installed via micropip
        const isAlreadyInstalling = lines.some(line => {
            const trimmed = line.trim();
            // Look for patterns like: await micropip.install('package') or micropip.install(['package1', 'package2'])
            const installPattern = new RegExp(
                `micropip\\.install\\s*\\(\\s*['"\`]${suggestion.installName}['"\`]\\s*\\)|` +
                `micropip\\.install\\s*\\(\\s*\\[.*['"\`]${suggestion.installName}['"\`].*\\]\\s*\\)`
            );
            return installPattern.test(trimmed);
        });
        
        // If the package is already being installed, don't add the installation code
        if (isAlreadyInstalling) {
            // Just remove the suggestion since it's already handled
            importSuggestions = importSuggestions.filter(s => s !== suggestion);
            return;
        }
        
        // Build the install code - only add micropip import if not present
        let installCode = '';
        if (!hasMicropipImport) {
            installCode += 'import micropip\n';
        }
        installCode += `await micropip.install('${suggestion.installName}')`;
        
        // Insert before the import line
        lines.splice(suggestion.line, 0, installCode);
        text = lines.join('\n');
        
        
        // Remove this suggestion since we've handled it
        importSuggestions = importSuggestions.filter(s => s !== suggestion);
        
        // Trigger text update
        if (liveTextUpdater) {
            liveTextUpdater({ target: { value: text } });
        }
        
        // Auto-resize textarea after content update
        if (textareaElement) {
            // Use setTimeout to ensure the DOM has updated with new content
            setTimeout(() => autoResizeTextarea(textareaElement), 0);
        }
    }

    function onPatched(e) { 
        text = e.detail.text;
    }   

    function onTyping(e) { 
        typing = e.detail.typing; 
    }

    function startEditing() {
        if(sandboxed) return;
        isEditing = true;
    }

    function stopEditing() {
        if(sandboxed) return;
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
        if(!sandboxed) {
          liveTextUpdater = (e) => {
              liveText.update(e.target.value);
          };
        }
        // Inject collapsible functionality if not already present
        if (!window.toggleCollapsible) {
            const script = document.createElement('script');
            script.textContent = collapsibleScript;
            document.head.appendChild(script);
        }

        // Check for import suggestions on mount
        if (type === 'code') {
            updateImportSuggestions();
        }
        
        // Auto-resize textarea on mount if it has content (for both Python and R)
        if ((type === 'code' || type === 'r') && textareaElement && text) {
            setTimeout(() => autoResizeTextarea(textareaElement), 0);
        }
    });
    
    // Reactive effect to auto-resize when text changes (for both Python and R)
    $effect(() => {
        if ((type === 'code' || type === 'r') && textareaElement && text !== undefined) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => autoResizeTextarea(textareaElement), 0);
        }
    });

    onDestroy(() => {
      if(sandboxed) return;
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
    {#if !sandboxed}
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
    {/if}

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
            {@html processEnhancedMarkdown(text)}
          </div>
        </div>
      {:else}
        <div class="rendered-markdown" onclick={startEditing} onkeydown={handleKeydown} role="button" tabindex="0">
          {@html processEnhancedMarkdown(text)}
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
          
          {#if importSuggestions.length > 0}
            <div class="import-suggestions">
              <div class="suggestions-header">
                <span class="font-sans text-sm suggestions-info">
                  📦 {importSuggestions.length} package{importSuggestions.length > 1 ? 's' : ''} available from Pyodide
                </span>
              </div>
              {#each importSuggestions as suggestion}
                <div class="import-suggestion">
                  <span class="font-sans text-sm suggestion-text">
                    Install <code>{suggestion.packageName}</code>
                    {#if suggestion.installName !== suggestion.packageName}
                      <span class="install-name">({suggestion.installName})</span>
                    {/if}
                  </span>
                  <button 
                    class="suggestion-btn"
                    onclick={() => insertInstallCode(suggestion)}
                    title="Click to add: await micropip.install('{suggestion.installName}')"
                  >
                    Add install
                  </button>
                </div>
              {/each}
            </div>
          {/if}
          
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
    min-height: 60px;
    max-height: 800px; /* Increased for longer code blocks */
    padding: 1rem;
    border: none;
    outline: none;
    resize: none; /* Disable manual resize since we auto-resize */
    overflow-y: auto; /* Allow scrolling if content exceeds max-height */
    font-family: 'Cutive Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #555958;
    background: transparent;
    box-sizing: border-box;
    transition: height 0.1s ease; /* Smooth height transitions */
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

  /* Collapsible Section Styles */
  .rendered-markdown :global(.collapsible-section) {
    margin: 1rem 0;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .rendered-markdown :global(.collapsible-header) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
    border-bottom: 1px solid #e9ecef;
  }

  .rendered-markdown :global(.collapsible-header:hover) {
    background: #e9ecef;
  }

  .rendered-markdown :global(.collapsible-icon) {
    font-size: 18px;
    color: var(--color-accent-1);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .rendered-markdown :global(.collapsible-title) {
    margin: 0;
    font-weight: 600;
    font-family: 'Raleway', sans-serif;
    color: #333;
    flex: 1;
  }

  .rendered-markdown :global(.collapsible-content) {
    padding: 1rem;
    background: white;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 1000px;
    }
  }

  /* Style content inside collapsible sections */
  .rendered-markdown :global(.collapsible-content p) {
    margin-bottom: 1em;
  }

  .rendered-markdown :global(.collapsible-content h1),
  .rendered-markdown :global(.collapsible-content h2),
  .rendered-markdown :global(.collapsible-content h3),
  .rendered-markdown :global(.collapsible-content h4),
  .rendered-markdown :global(.collapsible-content h5),
  .rendered-markdown :global(.collapsible-content h6) {
    margin-top: 0;
    margin-bottom: 0.75em;
  }

  /* KaTeX Math Styling */
  .rendered-markdown :global(.katex) {
    font-size: 1em;
  }

  .rendered-markdown :global(.katex-display) {
    margin: 1em 0;
    text-align: center;
  }

  .rendered-markdown :global(.math-error) {
    color: #cc0000;
    background: #ffe6e6;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Cutive Mono', monospace;
    font-size: 0.9em;
    border: 1px solid #ffcccc;
  }

  /* Ensure inline math doesn't break line height */
  .rendered-markdown :global(.katex .base) {
    display: inline-block;
    vertical-align: middle;
  }

  /* Import Suggestion Styles - Subtle & Minimal */
  .import-suggestions {
    margin: var(--space-1) 0 var(--space-2) 0;
    font-size: 12px;
  }

  .import-suggestion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    margin: 2px 0;
    background: rgba(250, 163, 54, 0.04);
    border-radius: 4px;
    border-left: 2px solid rgba(250, 163, 54, 0.3);
    opacity: 0.85;
    transition: all 0.2s ease;
  }

  .import-suggestion:hover {
    opacity: 1;
    background: rgba(250, 163, 54, 0.08);
  }

  .suggestion-text {
    flex: 1;
    font-family: 'Raleway', sans-serif;
    color: var(--gray-600);
    font-size: 11px;
  }

  .suggestion-text code {
    background: transparent;
    color: var(--primary-color);
    padding: 0 2px;
    font-family: 'Cutive Mono', monospace;
    font-size: 11px;
    font-weight: 600;
  }

  .suggestion-btn {
    background: transparent;
    color: var(--primary-color);
    border: 1px solid rgba(250, 163, 54, 0.3);
    padding: 2px 8px;
    border-radius: 3px;
    font-family: 'Raleway', sans-serif;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
    text-decoration: underline;
    text-decoration-color: transparent;
  }

  .suggestion-btn:hover {
    background: rgba(250, 163, 54, 0.1);
    border-color: var(--primary-color);
    text-decoration-color: var(--primary-color);
  }
</style>
