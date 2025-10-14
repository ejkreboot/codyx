import { supabase } from '$lib/util/supabase-client.js';
import { LexaKey } from '$lib/classes/lexasort.js';
import { writable } from 'svelte/store';
import Haikunator from 'haikunator'

/**
 * Notebook management class for Codyx interactive notebooks
 * 
 * Handles notebook persistence, cell management, collaboration features,
 * and integration with Supabase backend. Provides CRUD operations for
 * notebooks and manages sandbox/sharing functionality.
 * 
 * @class Notebook
 * @example
 * // Create a new notebook
 * const notebook = await Notebook.create('my-notebook-slug');
 * 
 * // Load an existing notebook
 * const existing = new Notebook('existing-slug');
 * await existing.load();
 * 
 * // Add cells to the notebook
 * const cellId = await notebook.addCell('python', 'print("Hello World")');
 * 
 * // Save changes
 * await notebook.save();
 * 
 * // Create a sandbox for experimentation
 * const sandbox = await notebook.createSandbox();
 */
export class Notebook {

    static haikunator = new Haikunator();
    
    // Debug flags for testing fault behavior
    static DEBUG_DELAY_REALTIME = false;
    static DEBUG_FAIL_REALTIME = false;
    static DEBUG_SIMULATE_DISCONNECT = false;

    /**
     * Create a new Notebook instance
     * @param {string} slug - Unique identifier for the notebook
     * @param {string} [owner='public'] - Owner of the notebook (user ID or 'public')
     */
    constructor(slug, owner = 'public') {
        this.slug = slug;
        this.owner = owner ?? 'public';
        this.id = null;
        this.sandboxSlug = null;
        this.mainSlug = null; // Will store the original slug when accessing via sandbox
        this.isSandbox = false;
        this.cellsStore = writable([]);
        this.initialized = false;
        this.channel = null;
        this.connectionState = 'disconnected'; // Track connection state
        this.pendingCellSyncEvents = []; // Queue for events when disconnected
        this.clientId = `nb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Unique client ID
        this.lastSyncTimestamp = null; // Track last successful sync timestamp for conflict resolution
    }

    // Helper to get current cells array when needed internally
    get cells() {
        let currentCells;
        this.cellsStore.subscribe(cells => currentCells = cells)();
        return currentCells;
    }
    
    static async create(slug, owner = 'public') {
        const nb = new Notebook(slug, owner);
        await nb.#init();
        return nb;
    }

    async checkIfSlugAvailable(newSlug) {
        if (newSlug === this.slug) return true; // no change, so it's "available"
        
        // Check if slug exists in either 'slug' or 'sandbox_slug' columns
        const { data, error } = await supabase
            .from('notebooks')
            .select('id')
            .or(`slug.eq.${newSlug},sandbox_slug.eq.${newSlug}`);
        if (error) {
            throw error;
        }
        
        return data && data.length === 0; // available if no rows found in either column
    }
    
    async renameSandbox(newSlug) {
        if (!newSlug) return;
        
        const isAvailable = await this.checkIfSlugAvailable(newSlug);
        if (!isAvailable) {
            throw new Error('That name is already taken');
        }
        
        const { error } = await supabase
            .from('notebooks')
            .update({ sandbox_slug: newSlug })
            .eq('id', this.id);
            
        if (error) throw error;
        
        this.sandboxSlug = newSlug;
    }

    async rename(newSlug) {
        if (!newSlug) return;
        
        const isAvailable = await this.checkIfSlugAvailable(newSlug);
        if (!isAvailable) {
            throw new Error('That name is already taken');
        }
        
        const { error } = await supabase
            .from('notebooks')
            .update({ slug: newSlug })
            .eq('id', this.id);
            
        if (error) throw error;
        
        this.slug = newSlug;
    }

    async createCopy(newSlug) {
        if (!newSlug) throw new Error('New slug is required for copy');
        
        const isAvailable = await this.checkIfSlugAvailable(newSlug);
        if (!isAvailable) {
            throw new Error('That name is already taken');
        }

        // Generate a unique sandbox slug for the new notebook
        const sandboxSlug = await this.#generateUniqueSandboxSlug();
        
        // Create new notebook entry
        const { data: newNotebookData, error: notebookError } = await supabase
            .from('notebooks')
            .insert({
                slug: newSlug,
                sandbox_slug: sandboxSlug,
                owner: this.owner
            })
            .select()
            .single();
            
        if (notebookError) throw notebookError;
        
        // Copy all cells from current notebook to new notebook
        // Fetch cells directly from database to ensure we get all current data
        const { data: currentCells, error: fetchError } = await supabase
            .from('cells')
            .select('content, type, position')
            .eq('notebook_id', this.id)
            .order('position');
            
        if (fetchError) {
            // Clean up the notebook if cell fetching failed
            await supabase.from('notebooks').delete().eq('id', newNotebookData.id);
            throw fetchError;
        }
        
        if (currentCells && currentCells.length > 0) {
            const cellsToInsert = currentCells.map(cell => ({
                notebook_id: newNotebookData.id,
                content: cell.content,
                type: cell.type,
                position: cell.position
            }));
            
            const { error: cellsError } = await supabase
                .from('cells')
                .insert(cellsToInsert);
                
            if (cellsError) {
                // Clean up the notebook if cell copying failed
                await supabase.from('notebooks').delete().eq('id', newNotebookData.id);
                throw cellsError;
            }
        }
        
        // Copy completed successfully - the UI will navigate to the new notebook
        return newSlug;
    }

    getSandboxUrl() {
        if (!this.sandboxSlug) return null;
        return `${window.location.origin}/notebooks?slug=${this.sandboxSlug}`;
    }

    getMainUrl() {
        // Get the original notebook URL (not sandbox)
        const mainSlug = this.isSandbox ? this.mainSlug : this.slug;
        return `${window.location.origin}/notebooks?${mainSlug}`;
    }

    async #generateUniqueSandboxSlug() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const candidateSlug = Notebook.haikunator.haikunate({ tokenLength: 0 });
            
            // Check if this sandbox slug is available
            const { data, error } = await supabase
                .from('notebooks')
                .select('id')
                .or(`slug.eq.${candidateSlug},sandbox_slug.eq.${candidateSlug}`);
                
            if (error) throw error;
            
            if (data.length === 0) {
                return candidateSlug; // Found a unique slug
            }
            
            attempts++;
        }
        
        // Fallback: add timestamp if we can't find a unique one
        const timestamp = Date.now().toString(36);
        return `${Notebook.haikunator.haikunate({ tokenLength: 0 })}-${timestamp}`;
    }

    async #init() {
        if (this.initialized) return;
        
        // Try to load by slug (check both main slug and sandbox_slug columns)
        const { data, error } = await supabase
            .from('notebooks')
            .select('id, slug, sandbox_slug, owner')
            .or(`slug.eq.${this.slug},sandbox_slug.eq.${this.slug}`)
            .maybeSingle();
        
        if (error) throw error;
        
        if (!data) {
            // Not found: generate unique sandbox slug and create
            const sandboxSlug = await this.#generateUniqueSandboxSlug();
            
            const { data: created, error: insErr } = await supabase
                .from('notebooks')
                .insert({ 
                    slug: this.slug, 
                    sandbox_slug: sandboxSlug,
                    owner: this.owner 
                })
                .select('id, slug, sandbox_slug, owner')
                .single();
            
            if (insErr) {
                if (insErr.code === '23505') {
                    // Race: someone created it first → reselect
                    const { data: nb, error: reSelErr } = await supabase
                        .from('notebooks')
                        .select('id, slug, sandbox_slug, owner')
                        .eq('slug', this.slug)
                        .single();
                    if (reSelErr) throw reSelErr;
                    this.id = nb.id;
                    this.sandboxSlug = nb.sandbox_slug;
                } else {
                    throw insErr;
                }
            } else {
                this.id = created.id;
                this.sandboxSlug = created.sandbox_slug;
            }
        } else {
            this.id = data.id;
            this.sandboxSlug = data.sandbox_slug;
            
            // Determine if we're accessing via sandbox slug
            this.isSandbox = (this.slug === data.sandbox_slug);
            
            // Store the main slug for reference
            this.mainSlug = data.slug;
        }
        
        const cells = await this.getCells();
        this.cellsStore.set(cells);
        
        if (cells.length === 0) {
            await this.upsertCell({ content: 'Welcome to your new notebook!', type: 'md', position: 'h' });
        }

        if(!this.isSandbox) {
            // Set up realtime channel for notebook-level changes (non-blocking)
            this.#setupRealtimeChannel();
        }

        this.initialized = true;
    }
    
    async #setupRealtimeChannel() {
        this.#setConnectionState('connecting');
        
        try {
            const channelName = `notebook_${this.id}`;
            
            // Clean up any existing channel
            if (this.channel) {
                try {
                    this.channel.unsubscribe();
                } catch (cleanupError) {
                    // Expected - ignore cleanup errors
                }
            }
            
            // Create channel with event handlers
            this.channel = supabase.channel(channelName)
                .on('broadcast', { event: 'cell_sync' }, (payload) => {
                    this.#handleCellSync(payload.payload);
                })
                .on('broadcast', { event: 'notebook_sync_request' }, (payload) => {
                    this.#handleNotebookSyncRequest(payload.payload);
                })
                .on('broadcast', { event: 'notebook_sync_response' }, (payload) => {
                    this.#handleNotebookSyncResponse(payload.payload);
                })
                .on('system', {}, ({ event, payload }) => {
                    this.#handleNotebookConnectionStateChange(event, payload);
                });
           
            // Subscribe with robust retry logic
            await this.#subscribeReady();
                        
        } catch (error) {
            console.log('⚠️ Initial notebook realtime setup failed, will retry:', error.message);
            this.#setConnectionState('disconnected');
            // Start retry process
            this.#handleConnectionLoss();
        }
    }

    async #subscribeReady(attempt = 0) {
        // Set connecting state when starting connection attempt
        this.#setConnectionState('connecting');
        
        // Apply exponential backoff delay for retry attempts
        if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // 1s, 2s, 4s, 8s... max 30s
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            // Always try to clean up existing channel (gracefully fail if not possible)
            if (this.channel && attempt > 0) {
                try {
                    this.channel.unsubscribe();
                } catch (cleanupError) {
                    // Expected - ignore cleanup errors
                }
                
                // Recreate channel with same configuration
                const channelName = `notebook_${this.id}`;
                this.channel = supabase.channel(channelName)
                    .on('broadcast', { event: 'cell_sync' }, (payload) => {
                        this.#handleCellSync(payload.payload);
                    })
                    .on('broadcast', { event: 'notebook_sync_request' }, (payload) => {
                        this.#handleNotebookSyncRequest(payload.payload);
                    })
                    .on('broadcast', { event: 'notebook_sync_response' }, (payload) => {
                        this.#handleNotebookSyncResponse(payload.payload);
                    })
                    .on('system', {}, ({ event, payload }) => {
                        this.#handleNotebookConnectionStateChange(event, payload);
                    });
            }
            
            const sub = await this.channel.subscribe();

            // Wait for connection to be established
            while (sub.state !== 'joined' && sub.state !== 'closed' && sub.state !== 'errored') {
                await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
            }

            if (sub.state === 'joined') {
                this.#setConnectionState('connected');
                
                // Request sync from other instances when first connecting
                setTimeout(() => {
                    if (this.channel && this.channel.state === 'joined') {
                        console.log("🔄 Requesting cell sync from other instances...");
                        this.channel.send({
                            type: 'broadcast',
                            event: 'notebook_sync_request',
                            payload: {
                                requesterId: this.clientId,
                                notebookId: this.id,
                                timestamp: Date.now()
                            }
                        });
                    }
                }, 100);
                
                return sub;
            }

            // If we reach here, connection failed
            throw new Error(`Channel failed to connect: ${sub.state}`);
            
        } catch (error) {
            console.log(`⚠️ Notebook realtime connection attempt ${attempt + 1} failed:`, error.message);
            
            // Always retry with incremented attempt
            return this.#subscribeReady(attempt + 1);
        }
    }

    async cellSync() {
        try {
            const cells = await this.getCells();
            this.cellsStore.set(cells);
        } catch (error) {
            console.log('⚠️ Failed to sync cells:', error);
        }
    }

    async #handleCellSync(data) {
        this.cellSync();
    }

    #handleNotebookConnectionStateChange(event, payload) {        
        switch (event) {
            case 'JOINED':
                this.#setConnectionState('connected');
                this.#requestSyncOnReconnect();
                break;
                
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                this.#setConnectionState('disconnected');
                this.#handleConnectionLoss();
                break;
        }
    }

    #setConnectionState(newState) {
        if (this.connectionState !== newState) {
            this.connectionState = newState;
            // Could emit events here if needed by UI components
        }
    }

    #requestSyncOnReconnect() {
        // Send any pending cell sync events and refresh cell data after reconnection
        setTimeout(async () => {
            if (this.channel && this.channel.state === 'joined') {
                // Send queued events first
                if (this.pendingCellSyncEvents.length > 0) {
                    for (const event of this.pendingCellSyncEvents) {
                        this.channel.send({
                            type: 'broadcast',
                            event: 'cell_sync',
                            payload: event
                        });
                    }
                    this.pendingCellSyncEvents = []; // Clear the queue
                }
                
                // Send sync request to other connected instances
                this.channel.send({
                    type: 'broadcast',
                    event: 'notebook_sync_request',
                    payload: {
                        requesterId: this.clientId,
                        notebookId: this.id,
                        timestamp: Date.now()
                    }
                });
                
                // Also refresh from database as fallback
                try {
                    const cells = await this.getCells();
                    this.cellsStore.set(cells);
                } catch (error) {
                    console.log('⚠️ Failed to refresh cells from database:', error);
                }
            }
        }, 100);
    }

    #handleConnectionLoss() {
        // Attempt to reconnect using subscribeReady with built-in retry logic
        this.#subscribeReady(); // Will automatically retry with backoff
    }

    async #handleNotebookSyncRequest(payload) {
        // Don't respond to our own requests
        if (payload.requesterId === this.clientId) return;
                
        // Get current cells and send them as a response
        try {
            const cells = await this.getCells();
            
            // Small delay to avoid message collisions
            setTimeout(() => {
                if (this.channel && this.channel.state === 'joined') {
                    this.channel.send({
                        type: 'broadcast',
                        event: 'notebook_sync_response',
                        payload: {
                            requesterId: payload.requesterId,
                            responderId: this.clientId,
                            notebookId: this.id,
                            cells: cells,
                            timestamp: Date.now()
                        }
                    });
                }
            }, Math.random() * 100); // Random delay 0-100ms
        } catch (error) {
            console.log('⚠️ Failed to respond to notebook sync request:', error);
        }
    }

    #handleNotebookSyncResponse(payload) {
        // Only process responses meant for us
        if (payload.requesterId !== this.clientId) return;
        
        // Check if this response is newer than our last sync
        if (this.lastSyncTimestamp && payload.timestamp <= this.lastSyncTimestamp) {
            return;
        }
        
        // Validate payload
        if (!payload.cells || !Array.isArray(payload.cells)) {
            return;
        }
        
        
        // Get current cells for comparison
        const currentCells = this.cells;
        const incomingCells = payload.cells;
        
        // Smart merge algorithm: find differences and resolve conflicts
        const mergedCells = this.#mergeCellsWithConflictResolution(currentCells, incomingCells);
        
        // Update store with merged results
        this.cellsStore.set(mergedCells);
        
        // Update sync timestamp
        this.lastSyncTimestamp = payload.timestamp;
        
        console.log(`✅ Sync completed. Merged ${mergedCells.length} cells`);
    }
    
    /**
     * Smart cell merging with conflict resolution
     * Strategy: "New content wins" - cells with newer content take precedence
     */
    #mergeCellsWithConflictResolution(currentCells, incomingCells) {
        const mergedCellsMap = new Map();
        
        // Step 1: Add all current cells to the map
        currentCells.forEach(cell => {
            mergedCellsMap.set(cell.id, {
                ...cell,
                _source: 'current'
            });
        });
        
        // Step 2: Process incoming cells
        incomingCells.forEach(incomingCell => {
            const existingCell = mergedCellsMap.get(incomingCell.id);
            
            if (!existingCell) {
                // New cell from remote - add it
                mergedCellsMap.set(incomingCell.id, {
                    ...incomingCell,
                    _source: 'remote_new'
                });
            } else {
                // Cell exists in both - check for content differences
                const contentChanged = existingCell.content !== incomingCell.content;
                const typeChanged = existingCell.type !== incomingCell.type;
                const positionChanged = existingCell.position !== incomingCell.position;
                
                if (contentChanged || typeChanged || positionChanged) {
                    // Content differs - check timestamps to resolve conflict
                    const existingTimestamp = new Date(existingCell.updated_at || existingCell.created_at).getTime();
                    const incomingTimestamp = new Date(incomingCell.updated_at || incomingCell.created_at).getTime();
                    
                    if (incomingTimestamp >= existingTimestamp) {
                        // Incoming cell is newer or same age - "new content wins"
                        mergedCellsMap.set(incomingCell.id, {
                            ...incomingCell,
                            _source: 'remote_updated'
                        });
                    } 
                }
                // If content is identical, no change needed
            }
        });
        
        // Step 3: Check for deleted cells (cells that exist locally but not in incoming)
        const incomingIds = new Set(incomingCells.map(cell => cell.id));
        currentCells.forEach(currentCell => {
            if (!incomingIds.has(currentCell.id)) {
                // Cell was deleted remotely - remove it from merged results
                mergedCellsMap.delete(currentCell.id);
            }
        });
        
        // Step 4: Convert back to array and sort by position
        const mergedCells = Array.from(mergedCellsMap.values())
            .map(cell => {
                // Remove internal tracking fields
                const { _source, ...cleanCell } = cell;
                return cleanCell;
            })
            .sort((a, b) => a.position.localeCompare(b.position));
        
        return mergedCells;
    }

    #broadcastCellSync(action, cellId) {
        if (this.isSandbox) return; // No sync for sandboxes
        
        const syncEvent = {
            action,
            cellId,
            notebookId: this.id,
            timestamp: Date.now()
        };
        
        // Try to send immediately if connected
        if (this.channel && this.channel.state === 'joined') {
            this.channel.send({
                type: 'broadcast',
                event: 'cell_sync',
                payload: syncEvent
            });
        } else {
            // Queue the event for when connection is restored
            console.log('📴 Queueing cell sync event (not connected):', syncEvent);
            this.pendingCellSyncEvents.push(syncEvent);
        }
    }


    
    
    /******************************************
    * 🗄️ Notebook CRUD 
    ******************************************/
    
    async createNotebook() {
        const { data, error } = await supabase
            .from('notebooks')
            .insert([{ slug: this.slug, owner: this.owner || 'public' }])
            .select()
            .single();
        if (error) throw error;
        const cells = await this.getCells();
        this.cellsStore.set(cells);
        if (cells.length === 0) {
            let cell = { content: 'Welcome to your new notebook!', type: "md", position: 'h' };
            this.upsertCell(cell);
        }
    }
    
    async deleteNotebook() {
        if(this.isSandbox) return;

        const { error } = await supabase
            .from('notebooks')
            .delete()
            .eq('id', this.id);
        if (error) throw error;
        
        // Clean up realtime channel
        if (this.channel) {
            await supabase.removeChannel(this.channel);
            this.channel = null;
        }
        
        this.cellsStore.set([]);
        this.initialized = false;
    }
    
    /******************************************
    * 🗄️ Cell CRUD 
    ******************************************/
    
    async upsertCell(cell) {
        if(this.isSandbox) {
            // Generate ID for new cells in sandbox mode
 
            return cell;
        }
        if (!this.id) throw new Error('Notebook not initialized');
        if (!cell.position) throw new Error('Cell position is required');
        const { data, error } = await supabase
                    .from('cells')
                    .upsert({ notebook_id: this.id, ...cell })
                    .select()
                    .single();
        if (error) throw error;
        
        // Update the store instead of this.cells
        this.cellsStore.update(cells => {
            const index = cells.findIndex(obj => obj.id === cell.id);
            const isNewCell = index === -1;
            
            if (isNewCell) {
                cells.push(data); // hydrated with ID, timestamps
                this.#broadcastCellSync('added', data.id);
            } else {
                cells[index] = data; // rehydrated with time stamps
            }
            return cells.sort((a, b) => a.position.localeCompare(b.position));
        });
        
        return data;
    }
    
    async getCells() {
        const { data, error } = await supabase
            .from('cells')
            .select('*')
            .eq('notebook_id', this.id)
            .order('position', { ascending: true });
        if (error) throw error;
        return data;
    }
    
    async deleteCell(id) {
        if(this.isSandbox) return;

        const { error } = await supabase
            .from('cells')
            .delete()
            .eq('id', id);
        if (error) throw error;
        
        this.#broadcastCellSync('deleted', id);        
        this.cellsStore.update(cells => cells.filter(c => c.id !== id));
    }  


    /******************************************
    * ⤵ Insert/Move Cells by LexaKey
    ******************************************/
    
    async insertCellAtIndex(index, cell) {
        if (!cell) throw new Error('Cell not found');
        if (index < 0 || index > this.cells.length) {
            throw new Error('Index out of bounds');
        }
        
        let after = index === 0 ? null : this.cells[index - 1].position;
        let before = index === this.cells.length ? null : this.cells[index].position;
        const newPosition = LexaKey.between(after, before);
        cell.position = newPosition;
        
        await this.upsertCell(cell); // sorts as side effect
        return cell;
    }

    async insertCell(cell, before, after) { // before and after are cells
        return this.moveCell(cell, before, after); // just a convenience alias
    }

    async insertCellAfter(cell, after) { // after is a cell
        const afterIndex = this.cells.findIndex(c => c.id === after.id); 
        return this.insertCellAtIndex(afterIndex + 1, cell);
    }

    async insertCellBefore(cell, before) { // before is a cell
        const beforeIndex = this.cells.findIndex(c => c.id === before.id); 
        return this.insertCellAtIndex(beforeIndex, cell);
    }
    
    async moveCell(cell, before, after) { // before and after are cells
        if (!cell) throw new Error('Cell not found');
        if(!before && !after) return cell; // no move

        const oldPosition = cell.position;
        const newPosition = LexaKey.between(before?.position || null, after?.position || null);
        cell.position = newPosition;
        
        await this.upsertCell(cell); // sorts as side effect - this will NOT broadcast since it's an update

        if(!this.isSandbox) {
            this.#broadcastCellSync('moved', cell.id);
        }

        return cell;
    }

    async pushCell(cell) {
        if (!cell) throw new Error('Must provide cell to pushCell function');
        if (this.cells.length === 0) {
            cell.position = LexaKey.middle();
        } else {
            let last = this.cells[this.cells.length - 1];
            const newPosition = LexaKey.between(last.position, null);
            cell.position = newPosition;
        }
        await this.upsertCell(cell); // sorts as side effect and handles sandbox mode
        return cell;
    }

    async moveCellDown(cellId) {
        const cell = this.cells.find(c => c.id === cellId);
        if (!cell) throw new Error('Cell not found');
        const index = this.cells.findIndex(c => c.id === cellId);
        let after = this.cells[index + 1].position;
        let before = index + 2 < this.cells.length ? this.cells[index + 2].position : null;
        const newPosition = LexaKey.between(after, before);
        cell.position = newPosition;
        await this.upsertCell(cell); // sorts as side effect

        if (!this.isSandbox) { // ← Add this check
            this.#broadcastCellSync('moved', cell.id);
        }
        return cell;
    }

    async moveCellUp(cellId) {
        const cell = this.cells.find(c => c.id === cellId);
        if (!cell) throw new Error('Cell not found');
        const index = this.cells.findIndex(c => c.id === cellId);
        let after = index - 2 >= 0 ? this.cells[index - 2].position : null;
        let before = this.cells[index - 1].position;
        const newPosition = LexaKey.between(after, before);
        cell.position = newPosition;
        await this.upsertCell(cell);

        if (!this.isSandbox) { // ← Add this check
            this.#broadcastCellSync('moved', cell.id);
        }
        return cell;
    }

    /******************************************
    * 📥 Import functionality
    ******************************************/
    
    async importCells(cells) {
        if (!Array.isArray(cells)) {
            throw new Error('Cells must be an array');
        }
        
        if (cells.length === 0) {
            return;
        }
        
        // Clear existing cells first
        const existingCells = this.cells;
        for (const cell of existingCells) {
            await this.deleteCell(cell.id);
        }
        
        // Add imported cells with proper positioning
        let lastPosition = null;
        
        for (let i = 0; i < cells.length; i++) {
            const cellData = cells[i];
            let position;
            
            if (i === 0) {
                // First cell gets middle position
                position = LexaKey.mid();
            } else {
                // Subsequent cells go after the previous one
                position = LexaKey.between(lastPosition, null);
            }
            
            await this.upsertCell({
                content: cellData.content,
                type: cellData.type,
                position: position
            });
            
            // Track the position for the next iteration
            lastPosition = position;
        }
    }

    // Clean up resources when notebook instance is no longer needed
    async destroy() {
        if (this.channel) {
            try {
                this.channel.unsubscribe();
            } catch (error) {
                // Ignore cleanup errors
            }
            await supabase.removeChannel(this.channel);
            this.channel = null;
        }
        
        // Reset the notebook state
        this.#setConnectionState('disconnected');
        this.pendingCellSyncEvents = [];
        this.initialized = false;
        this.cellsStore.set([]);
    }
}
