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
        if (!deckSlug || (deck && deck.slug === deckSlug)) return;
        
        try {
            isLoading = true;
            error = null;

            deck = await FlashCardDeck.create(deckSlug, "none"); // Using "none" as user for now
            cards = deck.cards; // Get all cards for editing
            
        } catch (err) {
            console.error('Failed to load deck:', err);
            error = err.message;
            deck = null;
            cards = [];
        } finally {
            isLoading = false;
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
            
            console.log('Card saved successfully');
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
            
            console.log('Card deleted successfully');
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
                    
                    console.log(`Successfully imported ${successCount} cards`);
                    
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
        if (slug) {
            loadDeck(slug);
        }
    });

</script>

<svelte:head>
    <title>CODYX - Interactive Flashcards</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
</svelte:head>


<div class="app-container">
    <main class="main-content">
        <div class="edit-container">
            {#if error}
            <div class="error-banner">
                <span class="material-symbols-outlined">error</span>
                {error}
            </div>
            {/if}

            {#if isLoading}
            <div class="loading-container">
                <div class="loading-spinner">
                    <span class="material-symbols-outlined spinning">progress_activity</span>
                </div>
                <p>Loading flashcard deck...</p>
            </div>
            {/if}

            <div class="deck-input-section">
                <div class="deck-info">
                    <div class="deck-input-controls">
                        <span class="deck-label">Deck Name:</span>
                        <input 
                            id="deck-name"
                            type="text" 
                            bind:value={deckNameInput}
                            bind:this={deckNameInputElement}
                            class="deck-name-input"
                            placeholder="my-flashcard-deck"
                            onkeydown={handleDeckNameKeydown}
                            disabled={isLoading}
                        />
                        <button 
                            class="open-deck-btn" 
                            onclick={openDeckByName}
                            disabled={isLoading || !deckNameInput.trim()}
                        >
                            <span class="material-symbols-outlined">folder_open</span>
                            Open Deck
                        </button>
                        <button class="create-new-btn" onclick={createNewDeck} disabled={isLoading}>
                            <span class="material-symbols-outlined">add</span>
                            Create New Deck
                        </button>

                    </div>
                </div>
            </div>

            {#if deck}
            <div class="deck-editor-section">
                <div class="deck-header">
                    <h2 class="deck-title">Editing: {deck.slug}</h2>
                    <div class="deck-stats">
                        <span class="card-count">{cards.length} cards</span>
                        <div class="deck-actions">
                            <button class="add-card-btn" onclick={addNewCard} disabled={isLoading}>
                                <span class="material-symbols-outlined">add</span>
                                Add New Card
                            </button>
                            <button class="import-btn" onclick={importCards} disabled={isLoading}>
                                <span class="material-symbols-outlined">place_item</span>
                                Import
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Deck Metadata -->
                <div class="deck-metadata">
                    <div class="metadata-field">
                        <label class="metadata-label">Topic:</label>
                        {#if isEditingTopic}
                            <div class="edit-field">
                                <input 
                                    type="text" 
                                    bind:value={topicText}
                                    class="metadata-input"
                                    placeholder="Enter topic (e.g., Mathematics, Science, History)"
                                    onkeydown={handleTopicKeydown}
                                    autofocus
                                />
                                <div class="edit-actions">
                                    <button class="save-btn" onclick={saveTopic} title="Save">
                                        <span class="material-symbols-outlined">check</span>
                                    </button>
                                    <button class="cancel-btn" onclick={cancelTopicEdit} title="Cancel">
                                        <span class="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <div class="display-field" onclick={startEditingTopic}>
                                <span class="field-value">{deck?.topic || 'Click to add topic'}</span>
                                <span class="edit-icon material-symbols-outlined">edit</span>
                            </div>
                        {/if}
                    </div>

                    <div class="metadata-field">
                        <label class="metadata-label">Description:</label>
                        {#if isEditingDescription}
                            <div class="edit-field">
                                <textarea 
                                    bind:value={descriptionText}
                                    class="metadata-textarea"
                                    placeholder="Enter description (Ctrl+Enter to save, Esc to cancel)"
                                    onkeydown={handleDescriptionKeydown}
                                    rows="3"
                                    autofocus
                                ></textarea>
                                <div class="edit-actions">
                                    <button class="save-btn" onclick={saveDescription} title="Save">
                                        <span class="material-symbols-outlined">check</span>
                                    </button>
                                    <button class="cancel-btn" onclick={cancelDescriptionEdit} title="Cancel">
                                        <span class="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <div class="display-field" onclick={startEditingDescription}>
                                <span class="field-value">{deck?.description || 'Click to add description'}</span>
                                <span class="edit-icon material-symbols-outlined">edit</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="cards-container">
                    {#if cards.length > 0}
                        {#each cards as card, index (card.id)}
                            <div class="card-wrapper">
                                <div class="card-header">
                                    <div class="card-number">Card {index + 1}</div>
                                    <button class="card-delete-btn" onclick={() => handleCardDelete(card)} title="Delete Card">
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
                            <div class="empty-icon">
                                <span class="material-symbols-outlined">quiz</span>
                            </div>
                            <h3>No cards yet</h3>
                            <p>Add your first flashcard to get started.</p>
                            <button class="add-first-card-btn" onclick={addNewCard}>
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
    @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
    
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: 'Raleway', sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        min-height: 100vh;
    }

    .app-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .main-content {
        flex: 1;
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
        min-width: 900px;
    }

    .edit-container {
        padding: 20px 20px;
        max-width: 900px;
        width: 900px;
        margin: auto;
        margin-top: 20px;
        display: flex;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    }

    .main-content {
        padding: 1rem;
    }

    /* Deck Info */
    /* Deck Info */
    .deck-info {
        margin-bottom: 2rem;
    }

    .deck-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .deck-name-input {
        padding: 0.375rem 0.5rem;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-size: 14px;
        font-family: 'Raleway', sans-serif;
        transition: border-color 0.2s ease;
        background: white;
        width: 200px;
        flex-shrink: 0;
    }

    .deck-name-input:focus {
        outline: none;
        border-color: #ffa000;
    }

    .deck-input-section {
        width: 100%;
        box-sizing: border-box;
    }

    .deck-info {
        margin-bottom: 0px; 
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        width: 100%;
        box-sizing: border-box;
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
        max-width: 100%;
        transition: all 0.2s ease;
        flex-wrap: nowrap;
        box-sizing: border-box;
    }

    .deck-input-controls:hover {
        background: #f1f3f4;
        border-color: #dee2e6;
    }

    .deck-label {
        color: #666;
        font-family: 'Raleway', sans-serif;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        flex-shrink: 0;
        display: inline-block;
    }

    .open-deck-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .open-deck-btn:hover:not(:disabled) {
        background: #0284c7;
        transform: translateY(-1px);
    }

    .create-new-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .create-new-btn:hover:not(:disabled) {
        background: #0284c7;
        transform: translateY(-1px);
    }

    .import-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #ffa000;
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

    .error-banner {
        background: linear-gradient(135deg, #ff4757, #ff3742);
        color: white;
        padding: 16px;
        margin-bottom: 20px;
        border-radius: 8px;
        border-left: 4px solid #ff1744;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
    }

    .error-banner .material-symbols-outlined {
        font-size: 20px;
    }

    .loading-container {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }

    .loading-spinner {
        margin-bottom: 16px;
    }

    .spinning {
        animation: spin 2s linear infinite;
        font-size: 32px;
        color: #ff4757;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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

    .deck-title {
        margin: 0;
        color: #2c3e50;
        font-size: 16px;
        font-weight: 600;
    }

    .deck-stats {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .card-count {
        color: #666;
        font-size: 14px;
        font-weight: 500;
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

    .metadata-label {
        font-size: 12px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
    }

    .display-field:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }

    .field-value {
        flex: 1;
        color: #495057;
        font-size: 14px;
    }

    .field-value:empty::before {
        content: attr(placeholder);
        color: #adb5bd;
        font-style: italic;
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

    .metadata-input, .metadata-textarea {
        padding: 8px 12px;
        border: 2px solid #0ea5e9;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        background: white;
        resize: vertical;
    }

    .edit-actions {
        display: flex;
        gap: 6px;
        align-self: flex-start;
    }

    .save-btn, .cancel-btn {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        font-size: 12px;
        transition: all 0.2s ease;
    }

    .save-btn {
        background: #28a745;
        color: white;
    }

    .save-btn:hover {
        background: #218838;
        transform: translateY(-1px);
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .cancel-btn:hover {
        background: #545b62;
        transform: translateY(-1px);
    }

    .save-btn .material-symbols-outlined,
    .cancel-btn .material-symbols-outlined {
        font-size: 14px;
    }

    .add-card-btn, .add-first-card-btn {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .add-card-btn:hover:not(:disabled), .add-first-card-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .add-card-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
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

    .card-number {
        color: #666;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0;
    }

    .card-delete-btn {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        opacity: 0.6;
    }

    .card-delete-btn:hover {
        background: #dc3545;
        color: white;
        opacity: 1;
        transform: translateY(-1px);
    }

    .card-delete-btn .material-symbols-outlined {
        font-size: 16px;
    }

    .empty-deck {
        text-align: center;
        padding: 60px 40px;
        color: #666;
        background: #f8f9fa;
        border-radius: 12px;
        border: 2px dashed #dee2e6;
    }

    .empty-icon {
        margin-bottom: 20px;
    }

    .empty-icon .material-symbols-outlined {
        font-size: 48px;
        color: #adb5bd;
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

    button:disabled {
        background: #dee2e6 !important;
        opacity: 1;
        cursor: not-allowed;
        transform: none !important;
    }

    button:disabled:hover {
        background: #dee2e6 !important;
        transform: none !important;
        box-shadow: none !important;
    }

</style>