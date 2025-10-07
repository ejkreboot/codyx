<script>
    import FlashcardEditor from '$lib/flashcards/FlashcardEditor.svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { FlashCardDeck } from '$lib/flashcards/flashcards.js';
    import Haikunator from 'haikunator';

    let deckNameInput = $state('');
    let deckNameInputElement = $state();
    let error = $state(null);
    let isLoading = $state(false);
    let deck = $state(null);
    let cards = $state([]);
    let isEditingTopic = $state(false);
    let isEditingDescription = $state(false);
    let topicText = $state('');
    let descriptionText = $state('');
    let currentlyLoadingSlug = $state(null);
    let lastLoadedSlug = $state(null);

    // Get slug from URL params
    let slug = $derived($page.url.searchParams.get('deck'));

    async function createNewDeck() {
        try {
            isLoading = true;
            const haikunator = new Haikunator();
            const newSlug = haikunator.haikunate({ tokenLength: 0 });
            await goto(`/flashcards/edit?deck=${encodeURIComponent(newSlug)}`);
        } catch (err) {
            console.error('Failed to create deck:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function openDeckByName() {
        const deckName = deckNameInput.trim();
        if (!deckName) {
            deckNameInputElement?.focus();
            return;
        }
        
        try {
            isLoading = true;
            // Convert to URL-friendly slug (replace spaces with hyphens, lowercase)
            const slug = deckName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await goto(`/flashcards/edit?deck=${encodeURIComponent(slug)}`);
        } catch (err) {
            console.error('Failed to open deck:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    function handleDeckNameKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            openDeckByName();
        }
    }

    async function loadDeck(deckSlug) {
        // Prevent race conditions
        if (!deckSlug || currentlyLoadingSlug === deckSlug) return;
        if (deck && (deck.slug === deckSlug || deck.sandbox_slug === deckSlug)) return;
        
        try {
            currentlyLoadingSlug = deckSlug;
            isLoading = true;
            error = null;
            deck = await FlashCardDeck.create(deckSlug, "none"); 
            if(deck.isSandbox) {
                error = "This is a sandbox deck. Editing is disabled."; 
                deck = null;
                cards = [];
            } else {
                cards = deck.cards;
            }
            lastLoadedSlug = deckSlug;
        } catch (err) {
            console.error('Failed to load deck:', err);
            error = err.message;
            deck = null;
            cards = [];
        } finally {
            isLoading = false;
            currentlyLoadingSlug = null;
        }
    }

    async function handleCardSave(updatedCard) {
        try {
            if (!deck) return;
            
            // Update card in the deck
            await deck.updateCard(updatedCard.id, updatedCard.question, updatedCard.answer);
            
            // Update local cards array
            cards = cards.map(card => 
                card.id === updatedCard.id ? updatedCard : card
            );            
        } catch (err) {
            console.error('Failed to save card:', err);
            error = err.message;
        }
    }

    async function handleCardDelete(cardToDelete) {
        try {
            if (!deck) return;
            
            // Delete card from the deck
            await deck.deleteFlashcard(cardToDelete.id);
            
            // Update local cards array
            cards = cards.filter(card => card.id !== cardToDelete.id);
        } catch (err) {
            console.error('Failed to delete card:', err);
            error = err.message;
        }
    }

    async function addNewCard() {
        try {
            if (!deck) return;
            
            isLoading = true;
            
            // Add new empty card to the deck
            const newCard = await deck.addCard('', ''); // Empty question and answer
            
            // Update local cards array
            cards = [...cards, newCard];
            
        } catch (err) {
            console.error('Failed to add new card:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function importCards() {
        try {
            // Create file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                isLoading = true;
                error = null;
                
                try {
                    const text = await file.text();
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length === 0) {
                        throw new Error('CSV file is empty');
                    }
                    
                    // Parse header to find front/back columns
                    const header = lines[0].split(',').map(col => col.trim().toLowerCase().replace(/"/g, ''));
                    const frontIndex = header.findIndex(col => col === 'front' || col === 'question');
                    const backIndex = header.findIndex(col => col === 'back' || col === 'answer');
                    
                    if (frontIndex === -1 || backIndex === -1) {
                        throw new Error('CSV must have "front" and "back" columns (or "question" and "answer")');
                    }
                    
                    // Parse data rows
                    const importedCards = [];
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        
                        // Simple CSV parsing (handles basic quotes)
                        const columns = parseCSVLine(line);
                        
                        if (columns.length > Math.max(frontIndex, backIndex)) {
                            const front = columns[frontIndex]?.trim().replace(/^"|"$/g, '') || '';
                            const back = columns[backIndex]?.trim().replace(/^"|"$/g, '') || '';
                            
                            if (front || back) {
                                importedCards.push({ front, back });
                            }
                        }
                    }
                    
                    if (importedCards.length === 0) {
                        throw new Error('No valid cards found in CSV file');
                    }
                    
                    // Add cards to deck
                    let successCount = 0;
                    for (const { front, back } of importedCards) {
                        try {
                            await deck.addCard(front, back);
                            successCount++;
                        } catch (err) {
                            console.warn('Failed to import card:', { front, back }, err);
                        }
                    }
                    
                    // Refresh cards display
                    cards = deck.cards;                    
                    
                } catch (err) {
                    console.error('Import failed:', err);
                    error = err.message;
                }
                
                isLoading = false;
            };
            
            // Trigger file picker
            input.click();
            
        } catch (err) {
            console.error('Failed to start import:', err);
            error = err.message;
            isLoading = false;
        }
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    function startEditingTopic() {
        topicText = deck?.topic || '';
        isEditingTopic = true;
    }

    function startEditingDescription() {
        descriptionText = deck?.description || '';
        isEditingDescription = true;
    }

    async function saveTopic() {
        try {
            if (!deck) return;
            
            await deck.updateDeck(deck.id, { topic: topicText.trim() });
            deck.topic = topicText.trim();
            isEditingTopic = false;
        } catch (err) {
            console.error('Failed to save topic:', err);
            error = err.message;
        }
    }

    async function saveDescription() {
        try {
            if (!deck) return;
            
            await deck.updateDeck(deck.id, { description: descriptionText.trim() });
            deck.description = descriptionText.trim();
            isEditingDescription = false;
        } catch (err) {
            console.error('Failed to save description:', err);
            error = err.message;
        }
    }

    function cancelTopicEdit() {
        isEditingTopic = false;
        topicText = '';
    }

    function cancelDescriptionEdit() {
        isEditingDescription = false;
        descriptionText = '';
    }

    function handleTopicKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveTopic();
        } else if (event.key === 'Escape') {
            cancelTopicEdit();
        }
    }

    function handleDescriptionKeydown(event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            saveDescription();
        } else if (event.key === 'Escape') {
            cancelDescriptionEdit();
        }
    }

    // Load deck when slug changes
    $effect(() => {
        if (slug && slug !== lastLoadedSlug) {
            loadDeck(slug);
        }
    });

</script>

<svelte:head>
    <title>CODYX - Edit Flashcards</title>
</svelte:head>


<div class="app-container">
    <main class="main-content">
        <div class="edit-container">
            {#if error}
            <div class="message message--error">
                <span class="material-symbols-outlined">error</span>
                {error}
            </div>
            {/if}

            {#if isLoading}
            <div class="loading-container">
                <div class="loading-spinner">
                    <span class="material-symbols-outlined icon--spinning">progress_activity</span>
                </div>
                <p>Loading flashcard deck...</p>
            </div>
            {/if}

            <div class="deck-input-section">
                <div class="deck-info">
                    <div class="deck-input-controls">
                        <span class="form__label-text">Deck Name:</span>
                        <input 
                            id="deck-name"
                            type="text" 
                            bind:value={deckNameInput}
                            bind:this={deckNameInputElement}
                            class="form__input"
                            placeholder="my-flashcard-deck"
                            onkeydown={handleDeckNameKeydown}
                            disabled={isLoading}
                        />
                        <button 
                            class="btn secondary" 
                            onclick={openDeckByName}
                            disabled={isLoading || !deckNameInput.trim()}
                        >
                            <span class="material-symbols-outlined">folder_open</span>
                            Open Deck
                        </button>
                        <button class="btn secondary" onclick={createNewDeck} disabled={isLoading}>
                            <span class="material-symbols-outlined">add</span>
                            Create New Deck
                        </button>

                    </div>
                </div>
            </div>

            {#if deck}
            <div class="deck-editor-section">
                <div class="deck-header">
                    <h2 class="content-info__name-text">Editing: {deck.slug}</h2>
                    <div class="deck-stats">
                        <span class="font-sans text-base">{cards.length} cards</span>
                        <div class="deck-actions">
                            <button class="btn primary" onclick={addNewCard} disabled={isLoading}>
                                <span class="material-symbols-outlined">add</span>
                                Add New Card
                            </button>
                            <button class="btn primary" onclick={importCards} disabled={isLoading}>
                                <span class="material-symbols-outlined">place_item</span>
                                Import
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Deck Metadata -->
                <div class="deck-metadata">
                    <div class="metadata-field">
                        <label for="topic-input" class="form__label-text">Topic:</label>
                        {#if isEditingTopic}
                            <div class="edit-field" style="display: flex; flex-direction: row; align-items: center; gap: 8px;">
                                <input 
                                    id="topic-input"
                                    type="text" 
                                    bind:value={topicText}
                                    class="form__input"
                                    style="flex: 1; min-width: 0;"
                                    placeholder="Enter topic (e.g., Mathematics, Science, History)"
                                    onkeydown={handleTopicKeydown}
                                />
                                <button class="btn tertiary small icon-only" onclick={saveTopic} title="Save">
                                    <span class="material-symbols-outlined">check</span>
                                </button>
                                <button class="btn tertiary small icon-only" onclick={cancelTopicEdit} title="Cancel">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        {:else}
                            <button type="button" class="display-field" onclick={startEditingTopic}>
                                <span class="font-sans text-base">{deck?.topic || 'Click to add topic'}</span>
                                <span class="material-symbols-outlined edit-icon">edit</span>
                            </button>
                        {/if}
                    </div>

                    <div class="metadata-field">
                        <label for="description-textarea" class="form__label-text">Description:</label>
                        {#if isEditingDescription}
                            <div class="edit-field">
                                <textarea 
                                    id="description-textarea"
                                    bind:value={descriptionText}
                                    class="form__textarea"
                                    placeholder="Enter description (Ctrl+Enter to save, Esc to cancel)"
                                    onkeydown={handleDescriptionKeydown}
                                    rows="3"
                                ></textarea>
                                <div class="edit-actions">
                                    <button class="btn tertiary small icon-only" onclick={saveDescription} title="Save">
                                        <span class="material-symbols-outlined">check</span>
                                    </button>
                                    <button class="btn tertiary small icon-only" onclick={cancelDescriptionEdit} title="Cancel">
                                        <span class="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <button type="button" class="display-field" onclick={startEditingDescription}>
                                <span class="font-sans text-base">{deck?.description || 'Click to add description'}</span>
                                <span class="material-symbols-outlined edit-icon">edit</span>
                            </button>
                        {/if}
                    </div>
                </div>

                <div class="cards-container">
                    {#if cards.length > 0}
                        {#each cards as card, index (card.id)}
                            <div class="card-wrapper">
                                <div class="card-header">
                                    <div class="form__label-text">Card {index + 1}</div>
                                    <button class="btn tertiary small icon-only" onclick={() => handleCardDelete(card)} title="Delete Card">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                                <FlashcardEditor 
                                    {card}
                                    onSave={handleCardSave}
                                />
                            </div>
                        {/each}
                    {:else}
                        <div class="empty-deck">
                            <span class="material-symbols-outlined icon--large">quiz</span>
                            <h3>No cards yet</h3>
                            <p>Add your first flashcard to get started.</p>
                            <button class="btn primary" onclick={addNewCard}>
                                <span class="material-symbols-outlined">add</span>
                                Add First Card
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
            {/if}

        </div>
    </main> 
</div>  

<style>
    @import '../../../assets/codyx-style.css';

    /* Page-specific styles */
    .edit-container {
        padding: 20px;
        max-width: 900px;
        width: 100%;
        margin: 20px auto;
        display: flex;
        flex-direction: column;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .deck-input-section {
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 20px;
    }

    .deck-input-controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        width: 100%;
        transition: all 0.2s ease;
        flex-wrap: nowrap;
        box-sizing: border-box;
    }

    .deck-input-controls:hover {
        background: #f1f3f4;
        border-color: #dee2e6;
    }

    .deck-editor-section {
        margin-top: 20px;
        border-top: 2px solid #e1e5e9;
        padding-top: 15px;
    }

    .deck-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        border-radius: 8px;
        border-left: 4px solid var(--brand-orange, #ff8c00);
    }

    .deck-stats {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .deck-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .deck-metadata {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .metadata-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .display-field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 20px;
        width: 100%;
        text-align: left;
        font-family: inherit;
        font-size: inherit;
    }

    .display-field:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }

    .display-field:focus {
        outline: 2px solid #0ea5e9;
        outline-offset: 2px;
    }

    .edit-icon {
        color: #adb5bd;
        font-size: 16px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .display-field:hover .edit-icon {
        opacity: 1;
    }

    .edit-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .edit-actions {
        display: flex;
        gap: 6px;
        align-self: flex-start;
    }

    .cards-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .card-wrapper {
        border: 2px solid #e1e5e9;
        border-radius: 12px;
        padding: 20px;
        background: white;
        transition: border-color 0.2s ease;
    }

    .card-wrapper:hover {
        border-color: #ff4757;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e1e5e9;
    }

    .empty-deck {
        text-align: center;
        padding: 60px 40px;
        color: #666;
        background: #f8f9fa;
        border-radius: 12px;
        border: 2px dashed #dee2e6;
    }



    .empty-deck h3 {
        margin: 0 0 10px 0;
        font-size: 20px;
        color: #495057;
    }

    .empty-deck p {
        margin: 0 0 25px 0;
        font-size: 14px;
    }
</style>