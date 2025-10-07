<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { page } from '$app/stores';
    import { goto, invalidateAll } from '$app/navigation';
    import { Notebook } from '$lib/classes/notebook.js'
    import Haikunator from 'haikunator'
    import CodyxCell from '$lib/components/CodyxCell.svelte';
    import { pyodideService } from '$lib/classes/pyodide-service.js';
    import { parseIpynbFile, validateIpynbFile } from '$lib/util/ipynb-parser.js';
    
    let error = $state(null);
    let nb = $state(null);
    let cells = $derived(nb ? nb.cellsStore : writable([]));
    let currentSlug = $state(null); // Track current slug to prevent duplicate loads
    
    // Notebook name editing state
    let isEditingName = $state(false);
    let editingNameValue = $state('');
    let createCopy = $state(false);
    
    // Sandbox slug editing state
    let isEditingSandboxSlug = $state(false);
    let editingSandboxValue = $state('');
    
    // svelte-ignore non_reactive_update
    let nameInputElement;
    // svelte-ignore non_reactive_update
    let sandboxInputElement;
    
    // Pyodide loading state
    let isPyodideLoading = $state(false);
    
    // Import state
    let isImporting = $state(false);
    let importError = $state(null);
    let fileInputElement;
    
    let handleCellEvent = async (e) => {
        const { type, ...args } = e.detail;
        const thisCellIndex = $cells.findIndex(cell => cell.id === args.docId);
        const thisCell = $cells[thisCellIndex];
        try {
            switch(type) {
                case "delete":
                await nb.deleteCell(args.docId);
                // No refresh needed - store updates automatically!
                break;
                case "addMarkdownCell":
                const newMdCell = { type: 'md', content: 'New Markdown Cell' };
                await nb.insertCellAfter(newMdCell, thisCell);
                break;
                case "addCodeCell":
                const newCodeCell = { type: 'code', content: '// New Code Cell' };
                await nb.insertCellAfter(newCodeCell, thisCell);
                break;
                case "addRCell":
                const newRCell = { type: 'r', content: '# New R Cell\nlibrary(ggplot2)' };
                await nb.insertCellAfter(newRCell, thisCell);
                break;
                case "moveUp":
                await nb.moveCellUp(args.docId);
                break;
                case "moveDown":
                await nb.moveCellDown(args.docId);
                break;
                case "edit":
                await nb.upsertCell({ 
                    id: args.docId, 
                    content: args.text, 
                    position: thisCell.position 
                });
                break;
            }
        } catch (err) {
            console.error("Cell operation failed:", err);
            error = err.message;
        }
    };
    
    async function createNewNotebook() {
        try {
            error = null; // Clear any previous errors
            // Generate a unique notebook name using Haikunator
            const haikunator = new Haikunator();
            const newNotebookName = haikunator.haikunate({ tokenLength: 0 });        
            const newUrl = `/notebooks?slug=${encodeURIComponent(newNotebookName)}`;
            await goto(newUrl);
        } catch (err) {
            console.error("Failed to create new notebook:", err);
            error = err.message;
        }
    }
    
    async function warmUpPyodide() {
        // Only show loading if Pyodide hasn't started initializing yet
        if (pyodideService.getStatus() === 'not-started') {
            isPyodideLoading = true;
            try {
                await pyodideService.initialize();
            } catch (err) {
                // Not critical - it will try again when user runs code
            } finally {
                isPyodideLoading = false;
            }
        } else {
            // Already initializing or ready, just trigger warm-up
            pyodideService.warmUp();
        }
    }
    
    function startEditingName() {
        if (!nb) return;
        error = null; // Clear any previous errors when starting to edit
        isEditingName = true;
        editingNameValue = nb.slug;
        setTimeout(() => nameInputElement?.focus(), 0);
    }
    
    function cancelEditingName() {
        isEditingName = false;
        editingNameValue = '';
        createCopy = false;
    }
    
    function startEditingSandboxSlug() {
        if (!nb || nb.isSandbox) return;
        error = null;
        isEditingSandboxSlug = true;
        editingSandboxValue = nb.sandboxSlug || '';
        setTimeout(() => sandboxInputElement?.focus(), 0);
    }
    
    function cancelEditingSandboxSlug() {
        isEditingSandboxSlug = false;
        editingSandboxValue = '';
    }
    
    async function saveSandboxSlug() {
        if (!nb || !editingSandboxValue.trim()) {
            cancelEditingSandboxSlug();
            return;
        }
        
        const newSandboxSlug = editingSandboxValue.trim().toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/--+/g, '-')         // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
        
        if (newSandboxSlug === nb.sandboxSlug) {
            cancelEditingSandboxSlug();
            error = null;
            return;
        }
        
        try {
            const isAvailable = await nb.checkIfSlugAvailable(newSandboxSlug);
            if (!isAvailable) {
                error = `Sandbox slug "${newSandboxSlug}" is already taken. Please choose a different name.`;
                return;
            }
            
            await nb.renameSandbox(newSandboxSlug);
            
            // Force reactivity update by reassigning the notebook object
            nb = nb;
            
            error = null;
            cancelEditingSandboxSlug();
            
        } catch (err) {
            console.error("Failed to save sandbox slug:", err);
            error = err.message;
        }
    }
    
    function handleSandboxKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveSandboxSlug();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingSandboxSlug();
        }
    }
    
    async function saveNotebookName() {
        if (!nb || !editingNameValue.trim()) {
            cancelEditingName();
            return;
        }
        
        const newSlug = editingNameValue.trim().toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/--+/g, '-')         // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
        
        if (newSlug === nb.slug && !createCopy) {
            cancelEditingName();
            error = null;
            return;
        }
        
        try {
            const isAvailable = await nb.checkIfSlugAvailable(newSlug);
            if (!isAvailable) {
                error = `Notebook name "${newSlug}" is already taken. Please choose a different name.`;
                return;
            }
            
            error = null;
            
            if (createCopy) {
                // Create a copy of the current notebook with the new slug
                try {
                    const newNotebook = await nb.createCopy(newSlug);
                    const newUrl = `/notebooks?slug=${encodeURIComponent(newSlug)}`;
                    await goto(newUrl, { replaceState: true });
                    cancelEditingName();
                } catch (copyErr) {
                    console.error("Failed to create copy:", copyErr);
                    error = copyErr.message || "Failed to create copy. Please try again.";
                }
            } else {
                // Just rename the current notebook
                await nb.rename(newSlug);
                const newUrl = `/notebooks?slug=${encodeURIComponent(newSlug)}`;
                await goto(newUrl, { replaceState: true });
                cancelEditingName();
            }
            
        } catch (err) {
            console.error("Failed to save notebook:", err);
            error = err.message;
        }
    }
    
    function handleNameKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveNotebookName();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingName();
        }
    }
    
    function triggerFileImport() {
        fileInputElement?.click();
    }
    
    async function handleFileImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        importError = null;
        
        const validation = validateIpynbFile(file);
        if (!validation.valid) {
            importError = validation.error;
            return;
        }
        
        try {
            isImporting = true;
            
            const fileContent = await file.text();
            const cells = parseIpynbFile(fileContent);
            
            if (cells.length === 0) {
                importError = 'No valid cells found in the notebook';
                return;
            }
            
            await nb.importCells(cells);
            
            // Clear the file input
            event.target.value = '';
            
        } catch (err) {
            console.error('Import failed:', err);
            importError = err.message;
        } finally {
            isImporting = false;
        }
    }
    
    $effect(async () => {
        try {
            const slug = $page.url.searchParams.get('slug') || 'default-notebook';
            
            if (currentSlug === slug) {
                return;
            }
            if (nb) {
                await nb.destroy();
                nb = null;
            }
            currentSlug = slug;
            nb = await Notebook.create(slug);
            
            warmUpPyodide();
            
        } catch (err) {
            error = err.message;
            currentSlug = null;
        }
    });
    
    $effect(() => {
        const handleCreateNewNotebook = () => {
            createNewNotebook();
        };
        
        window.addEventListener('createNewNotebook', handleCreateNewNotebook);
        
        return () => {
            window.removeEventListener('createNewNotebook', handleCreateNewNotebook);
        };
    });
    
</script>

<svelte:head>
<link href="/src/assets/codyx-style.css" rel="stylesheet">
</svelte:head>

{#if error}
<div class="message message--error">
    <span class="material-symbols-outlined">error</span>
    {error}
</div>
{/if}

{#if nb?.isSandbox}
<div class="message message--warning">
    <span class="material-symbols-outlined">beach_access</span>
    Sandbox Mode - Changes won't be saved
</div>
{/if}

{#if isPyodideLoading}
<div class="pyodide-loading-overlay">
    <div class="loading-content">
        <div class="loading-spinner">
            <span class="material-symbols-outlined spinning">hourglass_empty</span>
        </div>
        <div class="loading-text">
            <h3>Initializing Compute Environment</h3>
            <p>Embedding interpreters for code execution...</p>
            <div class="loading-steps">
                <div class="step step-1">Downloading  Runtimes</div>
                <div class="step step-2">Loading scientific libraries</div>
                <div class="step step-3">Almost ready...</div>
            </div>
        </div>
    </div>
</div>
{/if}

<div class="content-info compact">
    {#if isEditingName && !nb?.isSandbox}
        <input 
            bind:this={nameInputElement}
            bind:value={editingNameValue}
            class="content-info__editor"
            onkeydown={(e) => {
                if (e.key === 'Enter') saveNotebookName();
                if (e.key === 'Escape') cancelEditingName();
            }}
            placeholder="Notebook name..."
        />
        <label class="font-sans text-sm">
            <input 
                type="checkbox"
                bind:checked={createCopy}
                class="form__checkbox"
            />
            <span class="text-sm">Copy</span>
        </label>
        <button class="btn primary small icon-only" onclick={saveNotebookName} title="Save changes">
            <span class="material-symbols-outlined">check</span>
        </button>
        <button class="btn tertiary small icon-only" onclick={cancelEditingName} title="Cancel">
            <span class="material-symbols-outlined">close</span>
        </button>
    {:else}
        <span class="content-info__label">Notebook:</span>
        
        <div class="content-info__name-display content-info__name-display--editable"
            onclick={startEditingName}
            onkeydown={(e) => e.key === 'Enter' && startEditingName()}
            role="button"
            tabindex="0"
            aria-label="Click to edit notebook name">
            <span class="content-info__name-text">{nb?.slug || 'Loading...'}</span>
        </div>
        <div class="spacer"></div>    
        <div class="notebook-header__actions">
            {#if !nb?.isSandbox}
                <button 
                    class="btn primary"
                    onclick={triggerFileImport}
                    disabled={isImporting}
                    title="Import Jupyter notebook (.ipynb file)"
                >
                {#if isImporting}
                    <span class="material-symbols-outlined">hourglass_empty</span>
                    Importing...
                {:else}
                    <span class="material-symbols-outlined">place_item</span>
                    Import
                {/if}
                </button>
            {/if}
            <input 
                bind:this={fileInputElement}
                type="file"
                accept=".ipynb"
                onchange={handleFileImport}
                style="display: none;"
            />
        </div>
    {/if}
    {#if !nb?.isSandbox && nb?.sandboxSlug}
        <div class="content-info__section">
            <div class="font-sans text-sm">
                <span class="text-sm material-symbols-outlined">visibility</span>
                View-only link:
            </div>
            
            {#if isEditingSandboxSlug}
                <div class="sandbox-editor icon-text-align">
                    <input 
                    bind:this={sandboxInputElement}
                    bind:value={editingSandboxValue}
                    class="form__input"
                    onkeydown={handleSandboxKeydown}
                    placeholder="sandbox-slug-name"
                    />
                    <button class="btn tertiary small icon-only" onclick={saveSandboxSlug} title="Save sandbox slug">
                        <span class="material-symbols-outlined">check</span>
                    </button>
                    <button class="btn tertiary small icon-only" onclick={cancelEditingSandboxSlug} title="Cancel">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            {:else}
                <div class="content-info__url-container">
                    <span class="content-info__url-text">{nb.getSandboxUrl()}</span>
                    <button 
                        class="btn tertiary small icon-only"
                        onclick={startEditingSandboxSlug}
                        title="Edit sandbox slug"
                    >
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                        class="btn tertiary small icon-only"
                        onclick={() => navigator.clipboard.writeText(nb.getSandboxUrl())}
                        title="Copy view-only URL"
                    >
                        <span class="material-symbols-outlined">content_copy</span>
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>

{#if importError}
    <div class="message message--error">
        <span class="material-symbols-outlined">error</span>
        {importError}
    </div>
{/if}
{#each $cells as cell, index (cell.id)}
    <CodyxCell 
    initialText={cell.content}
    type={cell.type}
    docId={cell.id}
    userId="public"
    version={cell.updated_at}
    sandboxed={nb?.isSandbox}
    cellIndex={index + 1}
    on:edit={(e) => handleCellEvent({detail: {type: 'edit', ...e.detail}})}
    on:moveUp={(e) => handleCellEvent({detail: {type: 'moveUp', ...e.detail}})}
    on:moveDown={(e) => handleCellEvent({detail: {type: 'moveDown', ...e.detail}})}
    on:addCell={(e) => handleCellEvent({detail: {type: e.detail.cellType === 'md' ? 'addMarkdownCell' : e.detail.cellType === 'r' ? 'addRCell' : 'addCodeCell', ...e.detail}})}
    on:delete={(e) => handleCellEvent({detail: {type: 'delete', ...e.detail}})}
    />
{/each}

<style>
    /* Component-specific styles for CodyxNotebook */
    
    /* Pyodide loading overlay - unique to notebook */
    .pyodide-loading-overlay {
        font-family: 'Raleway', sans-serif;
        font-weight: 500;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(var(--gray-50-rgb), 0.85);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: var(--space-16);
        border-radius: var(--border-radius-lg);
    }
    
    .loading-content {
        text-align: center;
        max-width: 400px;
        padding: var(--space-8);
        background: white;
        border-radius: var(--border-radius-xl);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--gray-200);
        font-weight: 500;
        
    }
    
    .loading-spinner {
        margin-bottom: var(--space-6);
    }
    
    .loading-spinner .material-symbols-outlined {
        font-size: 48px;
        color: var(--primary-color);
        font-weight: 500;
    }
    
    .spinning {
        animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .loading-text h3 {
        margin: 0 0 var(--space-2) 0;
        color: var(--gray-900);
        font-weight: 600;
    }
    
    .loading-text p {
        margin: 0 0 var(--space-6) 0;
        color: var(--gray-600);
    }
    
    .loading-steps {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        color: var(--gray-500);
    }
    
    .step {
        padding: var(--space-1) 0;
        position: relative;
        opacity: 0;
        transform: translateY(10px);
        animation: stepAppear 0.5s ease-out forwards;
    }
    
    .step-1 {
        animation-delay: 1.5s;
    }
    
    .step-2 {
        animation-delay: 4s;
    }
    
    /* Sandbox slug editor styles */
    .sandbox-editor {
        gap: var(--space-2);
        align-items: center;
        flex-wrap: nowrap;
    }
    
    .sandbox-editor .form__input {
        min-width: 200px;
        flex-shrink: 0;
    }
    
    .step-3 {
        animation-delay: 6s;
    }
    
    .step::before {
        content: "⏳";
        margin-right: var(--space-2);
    }
    
    @keyframes stepAppear {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Notebook header layout */

    
    .notebook-header__actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-shrink: 0;
    }
    
    
    
    /* Responsive design */
    @media (max-width: 768px) {

    }
    
    @media (max-width: 480px) {


    /* Component-specific styles for CodyxNotebook */

    /* Pyodide loading overlay - unique to notebook */
    .pyodide-loading-overlay {
        font-family: 'Raleway', sans-serif;
        font-weight: 500;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(var(--gray-50-rgb), 0.85);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: var(--space-16);
        border-radius: var(--border-radius-lg);
    }

    .loading-content {
        text-align: center;
        max-width: 400px;
        padding: var(--space-8);
        background: white;
        border-radius: var(--border-radius-xl);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--gray-200);
        font-weight: 500;

    }

    .loading-spinner {
        margin-bottom: var(--space-6);
    }

    .loading-spinner .material-symbols-outlined {
        font-size: 48px;
        color: var(--primary-color);
        font-weight: 500;
    }

    .spinning {
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .loading-text h3 {
        margin: 0 0 var(--space-2) 0;
        color: var(--gray-900);
        font-weight: 600;
    }

    .loading-text p {
        margin: 0 0 var(--space-6) 0;
        color: var(--gray-600);
    }

    .loading-steps {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        color: var(--gray-500);
    }

    .step {
        padding: var(--space-1) 0;
        position: relative;
        opacity: 0;
        transform: translateY(10px);
        animation: stepAppear 0.5s ease-out forwards;
    }

    .step-1 {
        animation-delay: 1.5s;
    }

    .step-2 {
        animation-delay: 4s;
    }

    /* Sandbox slug editor styles */
    .sandbox-editor {
        gap: var(--space-2);
        align-items: center;
        flex-wrap: nowrap;
    }

    .sandbox-editor .form__input {
        min-width: 200px;
        flex-shrink: 0;
    }

    .step-3 {
        animation-delay: 6s;
    }

    .step::before {
        content: "⏳";
        margin-right: var(--space-2);
    }

    @keyframes stepAppear {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    
    }


    /* Responsive design */
    @media (max-width: 768px) {
        
        .notebook-header__actions {
            align-self: flex-end;
        }
    }

    @media (max-width: 480px) {
    }
    }
</style>