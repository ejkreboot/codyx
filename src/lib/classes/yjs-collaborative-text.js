import * as Y from 'yjs';
import diff from 'fast-diff';

/**
 * Yjs-based collaborative text editor with Supabase transport
 * 
 * Provides real-time collaborative text editing using Yjs CRDT.
 * Follows Yjs best practices for document synchronization and awareness.
 * 
 * @class YjsCollaborativeText
 * @extends EventTarget
 */
export class YjsCollaborativeText extends EventTarget {
    #ydoc = null;
    #ytext = null;
    #channel = null;
    #awareness = null;
    #updateHandler = null;
    #awarenessHandler = null;
    #initialText = '';
    #hasReceivedInitialSync = false;
    
    connectionState = 'disconnected';
    clientId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    
    constructor({ text = '', docId, supabase, userId = null }) {
        super();
        this.docId = docId;
        this.userId = userId;
        this.supabase = supabase;
        
        this.#ydoc = new Y.Doc();
        this.#ytext = this.#ydoc.getText('content');
        
        this.#initialText = text;
        this.#hasReceivedInitialSync = false;
        
        this.#awareness = {
            clientID: this.#ydoc.clientID,
            states: new Map(),
            
            setLocalState(state) {
                this.states.set(this.clientID, state);
            },
            
            getStates() {
                return this.states;
            },
            
            destroy() {
                this.states.clear();
            }
        };
    }
    
    static async create({ text, docId, supabase, userId = null }) {
        const yjsText = new YjsCollaborativeText({ text, docId, supabase, userId });
        await yjsText.connect();
        return yjsText;
    }
    
    async connect() {
        try {
            this.#setupYjsEventHandlers();
            
            this.#channel = this.supabase.channel(`yjs_${this.docId}`, {
                config: { broadcast: { self: false, ack: true } }
            });
            
            this.#setupChannelEventHandlers();            
            await this.#subscribeAndWait();
            this.#requestSync();
            
            setTimeout(() => {
                if (!this.#hasReceivedInitialSync && this.#initialText && this.#ytext.length === 0) {
                    this.#hasReceivedInitialSync = true;
                    this.#ydoc.transact(() => {
                        this.#ytext.insert(0, this.#initialText);
                    }, 'initial');
                }
            }, 1000);
            
        } catch (error) {
            this.#setConnectionState('disconnected');
            throw error;
        }
    }
    
    #setupYjsEventHandlers() {
        this.#updateHandler = (update, origin) => {
            // Broadcast local updates to other clients
            if (origin !== 'remote') {
                this.#broadcastUpdate(update);
            }
            
            const text = this.#ytext.toString();
            this.dispatchEvent(new CustomEvent('update', { 
                detail: { text, origin } 
            }));
        };
        
        this.#ydoc.on('update', this.#updateHandler);
        
        this.#awarenessHandler = () => {
            this.#broadcastAwareness();
            this.dispatchEvent(new CustomEvent('awareness', {
                detail: { 
                    states: Array.from(this.#awareness.getStates().entries())
                }
            }));
        };
    }
    
    #setupChannelEventHandlers() {
        this.#channel.on('broadcast', { event: 'yjs_update' }, ({ payload }) => {
            if (payload.clientId === this.clientId) return;
            
            try {
                const update = new Uint8Array(payload.update);
                Y.applyUpdate(this.#ydoc, update, 'remote');
            } catch (error) {
                console.error('Failed to apply Yjs update:', error);
            }
        });
        
        this.#channel.on('broadcast', { event: 'yjs_awareness' }, ({ payload }) => {
            if (payload.clientId === this.clientId) return;
            
            if (payload.state) {
                this.#awareness.states.set(payload.clientId, payload.state);
            } else {
                this.#awareness.states.delete(payload.clientId);
            }
            
            this.#awarenessHandler();
        });
        
        this.#channel.on('broadcast', { event: 'yjs_sync' }, ({ payload }) => {
            if (payload.type === 'request' && payload.requesterId !== this.clientId) {
                this.#respondToSync(payload.requesterId);
            } else if (payload.type === 'response' && payload.targetId === this.clientId) {
                this.#handleSyncResponse(payload);
            }
        });

        this.#channel.on('system', {}, ({ event, payload }) => {
            this.#handleConnectionStateChange(event, payload);
        });
    }
    
    #broadcastUpdate(update) {
        if (!this.#channel || this.#channel.state !== 'joined') return;
        
        this.#channel.send({
            type: 'broadcast',
            event: 'yjs_update',
            payload: {
                docId: this.docId,
                update: Array.from(update),
                clientId: this.clientId,
                userId: this.userId,
                timestamp: Date.now()
            }
        }).catch(error => {
            console.warn('Failed to broadcast update:', error);
        });
    }
    
    #broadcastAwareness() {
        if (!this.#channel || this.#channel.state !== 'joined') return;
        
        const localState = this.#awareness.states.get(this.#awareness.clientID);
        
        this.#channel.send({
            type: 'broadcast',
            event: 'yjs_awareness',
            payload: {
                docId: this.docId,
                clientId: this.clientId,
                userId: this.userId,
                state: localState,
                timestamp: Date.now()
            }
        }).catch(error => {
            console.warn('Failed to broadcast awareness:', error);
        });
    }
    
    #requestSync() {
        if (!this.#channel || this.#channel.state !== 'joined') return;
        
        this.#channel.send({
            type: 'broadcast',
            event: 'yjs_sync',
            payload: {
                type: 'request',
                docId: this.docId,
                clientId: this.clientId,
                userId: this.userId,
                requesterId: this.clientId,
                timestamp: Date.now()
            }
        });
    }
    
    #respondToSync(requesterId) {
        if (!this.#channel || this.#channel.state !== 'joined') return;
        
        const documentUpdate = Y.encodeStateAsUpdate(this.#ydoc);
        
        setTimeout(() => {
            this.#channel.send({
                type: 'broadcast',
                event: 'yjs_sync',
                payload: {
                    type: 'response',
                    docId: this.docId,
                    clientId: this.clientId,
                    userId: this.userId,
                    targetId: requesterId,
                    documentUpdate: Array.from(documentUpdate),
                    timestamp: Date.now()
                }
            });
        }, Math.random() * 100);
    }
    
    #handleSyncResponse(payload) {
        try {
            if (payload.documentUpdate) {
                const update = new Uint8Array(payload.documentUpdate);
                Y.applyUpdate(this.#ydoc, update, 'remote');
            }
            
            // Handle initial text if this is our first sync
            if (!this.#hasReceivedInitialSync) {
                this.#hasReceivedInitialSync = true;
                
                if (this.#ytext.length === 0 && this.#initialText) {
                    this.#ydoc.transact(() => {
                        this.#ytext.insert(0, this.#initialText);
                    }, 'initial');
                }
            }
        } catch (error) {
            console.error('Failed to handle sync response:', error);
        }
    }
    
    #handleConnectionStateChange(event, payload) {
        switch (event) {
            case 'JOINED':
                this.#setConnectionState('connected');
                this.#requestSync();
                break;
                
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                this.#setConnectionState('disconnected');
                this.#handleConnectionLoss();
                break;
        }
    }
    
    #handleConnectionLoss() {
        this.#awareness.states.clear();
        this.#subscribeAndWait();
    }
    
    #setConnectionState(newState) {
        if (this.connectionState !== newState) {
            this.connectionState = newState;
            this.dispatchEvent(new CustomEvent('connectionchange', {
                detail: { state: newState }
            }));
        }
    }

    // ============ PUBLIC API ============
    
    /**
     * Get the current text content
     */
    get text() {
        return this.#ytext.toString();
    }
    
    /**
     * Apply text changes using diff-based approach
     */
    applyDelta(newText) {
        const currentText = this.#ytext.toString();
        if (currentText === newText) return;
        
        this.#applyTextDiff(currentText, newText);
    }

    /**
     * Apply text changes using fast-diff
     */
    #applyTextDiff(oldText, newText) {
        const diffs = diff(oldText, newText);
        
        this.#ydoc.transact(() => {
            let offset = 0;
            
            for (const [operation, text] of diffs) {
                if (operation === diff.DELETE || operation === -1) {
                    this.#ytext.delete(offset, text.length);
                } else if (operation === diff.INSERT || operation === 1) {
                    this.#ytext.insert(offset, text);
                    offset += text.length;
                } else if (operation === diff.EQUAL || operation === 0) {
                    offset += text.length;
                }
            }
        });
    }
    
    /**
     * Insert text at position
     */
    insert(index, text) {
        this.#ytext.insert(index, text);
    }
    
    /**
     * Delete text in range  
     */
    delete(index, length) {
        this.#ytext.delete(index, length);
    }
    
    /**
     * Get Yjs text object for direct operations
     */
    get ytext() {
        return this.#ytext;
    }
    
    /**
     * Set awareness state (typing, cursor, etc.)
     */
    setAwareness(state) {
        this.#awareness.setLocalState(state);
        this.#broadcastAwareness();
    }
    
    /**
     * Get awareness states of all connected users
     */
    getAwarenessStates() {
        return Array.from(this.#awareness.getStates().entries());
    }
    
    // ============ CONNECTION MANAGEMENT ============
    
    async #subscribeAndWait(attempt = 0) {
        console.log(`🔌 YjsCollaborativeText.#subscribeAndWait attempt ${attempt + 1}`) ;
        this.#setConnectionState('connecting');
        
        if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
            if (this.#channel) {
                try {
                    this.#channel.unsubscribe();
                } catch (cleanupError) {
                    // Expected - ignore cleanup errors
                }
            }
            
            this.#channel = this.supabase.channel(`yjs_${this.docId}`, {
                config: { broadcast: { self: false, ack: true } }
            });
            
            this.#setupChannelEventHandlers();
            
            const sub = await this.#channel.subscribe();
            
            let waitTime = 0;
            const maxWait = 5000; // 5 second timeout
            
            while (sub.state !== 'joined' && sub.state !== 'closed' && sub.state !== 'errored' && waitTime < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 50));
                waitTime += 50;
            }
            
            if (sub.state === 'joined') {
                this.#setConnectionState('connected');
                return sub;
            }
            
            throw new Error(`Channel failed to connect: ${sub.state} after ${waitTime}ms`);
            
        } catch (error) {
            return this.#subscribeAndWait(attempt + 1);
        }
    }
    
    /**
     * Disconnect and clean up resources
     */
    disconnect() {
        if (this.#updateHandler) {
            this.#ydoc.off('update', this.#updateHandler);
        }
        this.#channel?.unsubscribe();
        this.#awareness?.destroy();        
        this.#ydoc?.destroy();
    }
}