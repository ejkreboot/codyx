import { supabase } from '$lib/supabase-client.js';
import { LexaKey } from './lexasort.js';
import { writable } from 'svelte/store';
import Haikunator from 'haikunator'


// create a notebook class that interacts with supabase
// Usage: const nb = await Notebook.create(slug).

export class Notebook {

    static haikunator = new Haikunator();

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

    getSandboxUrl() {
        if (!this.sandboxSlug) return null;
        return `${window.location.origin}/?slug=${this.sandboxSlug}`;
    }

    getMainUrl() {
        // Get the original notebook URL (not sandbox)
        const mainSlug = this.isSandbox ? this.mainSlug : this.slug;
        return `${window.location.origin}/${mainSlug}`;
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
            // Set up realtime channel for notebook-level changes
            await this.#setupRealtimeChannel();
        }

        this.initialized = true;
    }
    
    async #setupRealtimeChannel() {
        const channelName = `notebook_${this.id}`;
        
        this.channel = supabase.channel(channelName)
            .on('broadcast', { event: 'cell_sync' }, (payload) => {
                console.log('Cell sync from another session:', payload);
                this.#handleCellSync(payload.payload);
            })
        const sub = this.channel.subscribe();
        await this.#wait_for_join(sub);
    }

    async #handleCellSync(data) {
        const cells = await this.getCells();
        this.cellsStore.set(cells);
    }

    #broadcastCellSync(action, cellId) {
        if (!this.channel) return;
        this.channel?.send({
            type: 'broadcast',
            event: 'cell_sync',
            payload: { 
                action,
                cellId,
                notebookId: this.id 
            }
        });
    }

    async #wait_for_join(sub) {
        if (sub.state === 'joined') {
            return sub;
        }
        return new Promise((resolve, reject) => {
            const check = setInterval(() => {
            if (sub.state === 'joined') {
                clearInterval(check);
                resolve(sub);
            } else if (sub.state === 'closed' || sub.state === 'errored') {
                clearInterval(check);
                console.log(`Channel failed: ${sub.state}`);
                reject(new Error(`Channel failed: ${sub.state}`));
            }
            }, 10); // check every 10ms
        });
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
            if (!cell.id) {
                cell.id = 'sandbox_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Update local store with the cell changes but don't persist
            this.cellsStore.update(cells => {
                const index = cells.findIndex(obj => obj.id === cell.id);
                if (index === -1) {
                    cells.push(cell);
                } else {
                    cells[index] = cell;
                }
                return cells.sort((a, b) => a.position.localeCompare(b.position));
            });
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

    // Clean up resources when notebook instance is no longer needed
    async destroy() {
        if (this.channel) {
            await supabase.removeChannel(this.channel);
            this.channel = null;
        }
    }
}
