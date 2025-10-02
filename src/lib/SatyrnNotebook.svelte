<script>
import { onMount } from 'svelte';
import { writable } from 'svelte/store';
import { page } from '$app/stores';
import { goto, invalidateAll } from '$app/navigation';
import { Notebook } from '$lib/notebook.js'
import Haikunator from 'haikunator'
import SatyrnCell from './SatyrnCell.svelte';
import { pyodideService } from '$lib/pyodide-service.js';

let error = $state(null);
let nb = $state(null);
let cells = $derived(nb ? nb.cellsStore : writable([]));
let currentSlug = $state(null); // Track current slug to prevent duplicate loads

// Notebook name editing state
let isEditingName = $state(false);
let editingNameValue = $state('');
let nameInputElement;

// Pyodide loading state
let isPyodideLoading = $state(false);

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
        const newUrl = `/?slug=${encodeURIComponent(newNotebookName)}`;
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
            console.log('Pyodide warm-up failed:', err.message);
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
    // Focus the input after it becomes visible
    setTimeout(() => nameInputElement?.focus(), 0);
}

function cancelEditingName() {
    isEditingName = false;
    editingNameValue = '';
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
    
    if (newSlug === nb.slug) {
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
        const newUrl = `/?slug=${encodeURIComponent(newSlug)}`;
        await goto(newUrl, { replaceState: true });
        cancelEditingName();
        
    } catch (err) {
        console.error("Failed to rename notebook:", err);
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
        
        // Warm up Pyodide in the background for faster code execution
        warmUpPyodide();

    } catch (err) {
        error = err.message;
        currentSlug = null;
    }
});

// Listen for new notebook events from the header
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
                <h3>🐍 Initializing Python Environment</h3>
                <p>Setting up Pyodide for code execution...</p>
                <div class="loading-steps">
                    <div class="step">Downloading Python runtime</div>
                    <div class="step">Loading scientific libraries</div>
                    <div class="step">Almost ready...</div>
                </div>
            </div>
        </div>
    </div>
{/if}

    <div class="notebook-header">
        <div class="notebook-name-section">
            {#if isEditingName}
                <input 
                    bind:this={nameInputElement}
                    bind:value={editingNameValue}
                    class="notebook-name-input"
                    onblur={saveNotebookName}
                    onkeydown={(e) => {
                        if (e.key === 'Enter') saveNotebookName();
                        if (e.key === 'Escape') cancelEditingName();
                    }}
                    placeholder="Notebook name..."
                />
            {:else}
                <div class="notebook-info">
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
                    <div class="notebook-url">
                        {$page.url.href}
                        {#if !nb?.isSandbox && nb?.sandboxSlug}
                            <span class="sandbox-url-inline">SANDBOX: {nb.getSandboxUrl()}</span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>{#each $cells as cell, index (cell.id)}
    <SatyrnCell 
        initialText={cell.content}
        type={cell.type}
        docId={cell.id}
        userId="public"
        version={cell.updated_at}
        cellIndex={index + 1}
        on:edit={(e) => handleCellEvent({detail: {type: 'edit', ...e.detail}})}
        on:moveUp={(e) => handleCellEvent({detail: {type: 'moveUp', ...e.detail}})}
        on:moveDown={(e) => handleCellEvent({detail: {type: 'moveDown', ...e.detail}})}
        on:addCell={(e) => handleCellEvent({detail: {type: e.detail.cellType === 'md' ? 'addMarkdownCell' : 'addCodeCell', ...e.detail}})}
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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
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
}

.step::before {
    content: "⏳";
    margin-right: 0.5rem;
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

.notebook-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.notebook-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    max-width: fit-content;
}

.notebook-name:hover {
    background: #f8f9fa;
}

.notebook-label {
    color: #555958;
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

.notebook-url {
    font-family: 'Cutive Mono', monospace;
    font-size: 11px;
    color: #aaa;
    font-weight: 400;
    margin-left: 0;
    padding: 0;
    opacity: 0.8;
    word-break: break-all;
    max-width: 100%;
}

.sandbox-url-inline {
    margin-left: 1rem;
    color: #888;
    font-weight: 500;
}
</style>