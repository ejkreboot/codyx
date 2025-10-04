<script>
import { onMount } from 'svelte';
import { writable } from 'svelte/store';
import { page } from '$app/stores';
import { goto, invalidateAll } from '$app/navigation';
import { Notebook } from '$lib/notebook.js'
import Haikunator from 'haikunator'
import CodyxCell from './CodyxCell.svelte';
import { pyodideService } from '$lib/pyodide-service.js';
import { parseIpynbFile, validateIpynbFile } from '$lib/ipynb-parser.js';

let error = $state(null);
let nb = $state(null);
let cells = $derived(nb ? nb.cellsStore : writable([]));
let currentSlug = $state(null); // Track current slug to prevent duplicate loads

// Notebook name editing state
let isEditingName = $state(false);
let editingNameValue = $state('');
let createCopy = $state(false);

// svelte-ignore non_reactive_update
let nameInputElement;

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

{#if error}
    <div class="error">{error}</div>
{/if}

{#if nb?.isSandbox}
    <div class="sandbox-banner">
        🏖️ Sandbox Mode - Changes won't be saved
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

    <div class="notebook-header">
        <div class="notebook-name-section">
            {#if isEditingName}
                <div class="notebook-editing-container">
                    <input 
                        bind:this={nameInputElement}
                        bind:value={editingNameValue}
                        class="notebook-name-input"
                        onkeydown={(e) => {
                            if (e.key === 'Enter') saveNotebookName();
                            if (e.key === 'Escape') cancelEditingName();
                        }}
                        placeholder="Notebook name..."
                    />
                    <label class="create-copy-option">
                        <input 
                            type="checkbox"
                            bind:checked={createCopy}
                            class="create-copy-checkbox"
                        />
                        <span class="create-copy-label">Create copy</span>
                    </label>
                    <button class="save-name-btn" onclick={saveNotebookName} title="Save changes">
                        <span class="material-symbols-outlined">check</span>
                    </button>
                    <button class="cancel-name-btn" onclick={cancelEditingName} title="Cancel">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            {:else}
                <div class="notebook-info">
                    <div class="notebook-container">
                        <div 
                            class="notebook-name" 
                            onclick={startEditingName}
                            onkeydown={(e) => e.key === 'Enter' && startEditingName()}
                            role="button"
                            tabindex="0"
                            aria-label="Click to edit notebook name"
                        >
                            <span class="notebook-label">Notebook:</span>
                            <span class="notebook-title">{nb?.slug || 'Loading...'}</span>
                            <span class="material-symbols-outlined edit-icon">edit</span>
                        </div>
                        
                        {#if !nb?.isSandbox && nb?.sandboxSlug}
                            <div class="view-link-section">
                                <span class="view-label">
                                    <span class="material-symbols-outlined">visibility</span>
                                    View-only:
                                </span>
                                <div class="view-url-container">
                                    <span class="view-url-text">{nb.getSandboxUrl()}</span>
                                    <button 
                                        class="view-copy-btn"
                                        onclick={() => navigator.clipboard.writeText(nb.getSandboxUrl())}
                                        title="Copy view-only URL"
                                    >
                                        <span class="material-symbols-outlined">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
        
        <div class="notebook-actions">
            {#if !nb?.isSandbox}
            <button 
                class="import-btn"
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
    </div>
    
    {#if importError}
        <div class="error-message">
            <span class="material-symbols-outlined">error</span>
            {importError}
        </div>
    {/if}{#each $cells as cell, index (cell.id)}
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
:root {
    --color-accent-1: #ffa000;
    --color-accent-2: #0095f2;
}

.error {
    color: #d63031;
    background: #fff5f5;
    border: 1px solid #fab1a0;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin: 1rem 0.5rem;
    font-family: 'Raleway', sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(214, 48, 49, 0.1);
}

.sandbox-banner {
    background: linear-gradient(135deg, var(--color-accent-1), #ffb74d);
    color: white;
    text-align: center;
    padding: 1rem 1.25rem;
    margin: 0 0 2rem 0;
    border-radius: 8px;
    font-family: 'Raleway', sans-serif;
    font-size: 15px;
    font-weight: 600;
    box-shadow: 0 2px 12px rgba(255, 160, 0, 0.3);
    border: 1px solid rgba(255, 183, 77, 0.5);
}

.pyodide-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(248, 249, 250, 0.85);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 4rem;
    border-radius: 12px;
}

.loading-content {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
}

.loading-spinner {
    margin-bottom: 1.5rem;
}

.loading-spinner .material-symbols-outlined {
    font-size: 48px;
    color: var(--color-accent-1);
}

.spinning {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.loading-text h3 {
    margin: 0 0 0.5rem 0;
    font-family: 'Raleway', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.loading-text p {
    margin: 0 0 1.5rem 0;
    font-family: 'Raleway', sans-serif;
    font-size: 14px;
    color: #666;
}

.loading-steps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-family: 'Raleway', sans-serif;
    font-size: 12px;
    color: #888;
}

.step {
    padding: 0.25rem 0;
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

.step-3 {
    animation-delay: 6s;
}

.step::before {
    content: "⏳";
    margin-right: 0.5rem;
}

@keyframes stepAppear {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.notebook-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0 0;
}

.notebook-name-section {
    flex: 1;
}

.notebook-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
    margin-left: 1rem;
}

.import-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-accent-1);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.import-btn:hover:not(:disabled) {
    background: #e6900a;
    transform: translateY(-1px);
}

.import-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
}

.error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.notebook-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    width: 100%;
}

.notebook-container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    max-width: fit-content;
    transition: all 0.2s ease;
}

.notebook-container:hover {
    background: #f1f3f4;
    border-color: #dee2e6;
}

.notebook-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.notebook-name:hover .notebook-title {
    color: #e6900a;
}

.notebook-label {
    color: #666;
    font-family: 'Raleway', sans-serif;
    font-size: 14px;
    font-weight: 500;
}

.notebook-title {
    color: var(--color-accent-1);

    font-family: 'Raleway', sans-serif;
    font-size: 16px;
    font-weight: 600;
}

.edit-icon {
    font-size: 16px !important;
    color: #888;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.notebook-name:hover .edit-icon {
    opacity: 1;
}

.view-link-section {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding-left: 1rem;
    border-left: 1px solid #dee2e6;
}

.view-label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: 'Raleway', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #6c757d;
    white-space: nowrap;
}

.view-label .material-symbols-outlined {
    font-size: 12px;
    color: #6c757d;
}

.view-url-container {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.view-url-text {
    font-family: 'Cutive Mono', monospace;
    font-size: 10px;
    color: #495057;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 3px;
    padding: 0.25rem 0.4rem;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.view-copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.view-copy-btn:hover {
    background: var(--color-accent-1);
    border-color: var(--color-accent-1);
    color: white;
    transform: translateY(-1px);
}

.view-copy-btn .material-symbols-outlined {
    font-size: 10px;
}

.notebook-name-input {
    padding: 0.5rem 0.75rem;
    border: 2px solid #0095f2;
    border-radius: 6px;
    font-family: 'Raleway', sans-serif;
    font-size: 16px;
    font-weight: 600;
    background: white;
    outline: none;
    min-width: 200px;
    max-width: 400px;
}

.notebook-name-input:focus {
    box-shadow: 0 0 0 3px rgba(0, 149, 242, 0.1);
}

.notebook-editing-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.save-name-btn, .cancel-name-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.save-name-btn {
    background: var(--color-accent-1);
    color: white;
}

.save-name-btn:hover {
    background: #e6900a;
    transform: translateY(-1px);
}

.cancel-name-btn {
    background: #f8f9fa;
    color: #666;
    border: 1px solid #dee2e6;
}

.cancel-name-btn:hover {
    background: #e9ecef;
    color: #495057;
}

.create-copy-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: 'Raleway', sans-serif;
    font-size: 13px;
    color: #666;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;
}

.create-copy-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent-1);
    cursor: pointer;
}

.create-copy-label {
    cursor: pointer;
    font-weight: 500;
}

.create-copy-option:hover .create-copy-label {
    color: var(--color-accent-1);
}

.notebook-url {
    font-family: 'Cutive Mono', monospace;
    font-size: 11px;
    color: #aaa;
    font-weight: 400;
    margin-left: 0;
    padding: 0;
    opacity: 0.8;
    word-break: break-all;
    text-align: right;
    flex-shrink: 0;
    max-width: 60%;
}

.sandbox-url-inline {
    margin-left: 6px;
    color: #aaa;
    font-weight: 400;
}

/* Responsive design */
@media (max-width: 768px) {
    .notebook-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
    
    .notebook-actions {
        margin-left: 0;
        align-self: flex-end;
    }
    
    .notebook-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        max-width: 100%;
    }
    
    .view-link-section {
        padding-left: 0;
        border-left: none;
        border-top: 1px solid #dee2e6;
        padding-top: 0.5rem;
        width: 100%;
    }
    
    .view-url-text {
        max-width: 220px;
    }
}
</style>