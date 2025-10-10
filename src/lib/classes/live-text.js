import DiffMatchPatch from 'diff-match-patch';

/**
 * Real-time collaborative text editing using operational transformation
 * 
 * Provides live text synchronization between multiple clients using diff-match-patch
 * algorithm for operational transformation. Handles conflict resolution, typing
 * indicators, and real-time updates via Supabase real-time channels.
 * 
 * @class LiveText
 * @extends EventTarget
 * @example
 * // Create collaborative text editor
 * const liveText = await LiveText.create('Initial content', 'doc-123', supabase, 'user-456');
 * 
 * // Listen for text changes
 * liveText.addEventListener('textchange', (event) => {
 *   console.log('Text updated:', event.detail.text);
 * });
 * 
 * // Update text (will sync to other clients)
 * liveText.updateText('New content here');
 * 
 * // Handle typing indicators
 * liveText.addEventListener('typing', (event) => {
 *   console.log('User typing:', event.detail.clientId);
 * });
 */
export class LiveText extends EventTarget {
    
    #canonical = null;      // private per-instance state
    #debounceTimer = null;
    #channel = null;
    #dirty = false;
    #typing = false;
    #typingIdle = null;
    initialized = false;
    ready = false;
    clientId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    lastSyncResponseTimestamp = null; // Track sync response timestamps for optimization

    
    constructor({ text = '', docId, supabase, userId = null, debounce = 500, version }) {
        super();
        this.text = text;
        this.docId = docId;
        this.userId = userId;
        this.supabase = supabase;
        this.debounce = debounce;
        this.version = version; 
    }
    
    static async create({text, docId, supabase, userId=null, debounce=500, version}) {
        const lt = new LiveText({ text, docId, supabase, userId, debounce, version });
        await lt.init();
        return lt;
    }
    
    async init() {
        if (this.initialized) return;
        
        this.#canonical = this.text;

        this.#channel = this.supabase.channel(`${this.docId}`, {
            config: { broadcast: { self: false, ack: true } }
        });
            
        // Setup all event handlers
        this.#setupChannelEventHandlers();        
        
        const sub = await this.subscribeReady(); // wait until we're really, truly joined.
       
        // Reset sync timestamp and request sync from other sessions
        this.lastSyncResponseTimestamp = null;
        this.#channel.send({
            type: 'broadcast',
            event: 'lt_sync',
            payload: { 
                type: 'request', 
                docId: this.docId, 
                version: this.version, 
                clientId: this.clientId, 
                userId: this.userId,
                requesterId: this.clientId
            }
        });
        
        // Debug: Simulate disconnect after connection
        if (LiveText.DEBUG_SIMULATE_DISCONNECT) {
            console.log('🐛 DEBUG: Will simulate disconnect in 10 seconds...');
            setTimeout(() => {
                console.log('🐛 DEBUG: Simulating disconnect now...');
                this.#channel.unsubscribe();
            }, 10000);
        }
    }

    #handleSyncResponse(payload) {
        
        // If this is our first sync response, always compare content
        if (this.lastSyncResponseTimestamp === null) {
            
            const shouldUpdate = this.#shouldUpdateFromRemote(payload);
            
            if (shouldUpdate) {
                this.#applyRemoteUpdate(payload);
            } else {
            }
            
            // Set the timestamp regardless of whether we updated
            this.lastSyncResponseTimestamp = payload.timestamp;
            return;
        }
        
        // For subsequent responses, only consider if timestamp is newer
        if (payload.timestamp > this.lastSyncResponseTimestamp) {
            this.#applyRemoteUpdate(payload);
            this.lastSyncResponseTimestamp = payload.timestamp;
        } else {
            console.log('⏰ Ignoring slower/stale sync response for cell');
        }
    }

    #shouldUpdateFromRemote(payload) {
        // Compare versions first (database timestamps)
        if (payload.version && this.version) {
            const remoteTime = new Date(payload.version);
            const localTime = new Date(this.version);
            
            if (remoteTime > localTime) {
                return true; // Remote has newer database version
            }
            if (remoteTime < localTime) {
                return false; // Local is newer
            }
        }
        
        // If versions are equal/missing, compare content
        return payload.text !== this.text;
    }

    #applyRemoteUpdate(payload) {
        this.#canonical = payload.text;
        this.text = payload.text;
        this.#dirty = false;
        this.version = payload.version;
        this.#setTyping(false);
        this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
    }

    #handleConnectionStateChange(event, payload) {
        console.log(`🔌 LiveText connection state: ${event}`, payload);
        
        switch (event) {
            case 'JOINED':
                console.log('✅ LiveText reconnected - requesting sync...');
                this.#requestSyncOnReconnect();
                break;
                
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                console.log('📴 LiveText connection lost - resetting sync state and attempting reconnection...');
                this.#handleConnectionLoss();
                break;
        }
    }

    #requestSyncOnReconnect() {
        // Reset sync timestamp for fresh sync cycle after reconnection
        this.lastSyncResponseTimestamp = null;
        
        // Small delay to ensure channel is fully ready
        setTimeout(() => {
            if (this.#channel && this.#channel.state === 'joined') {
                console.log('🔄 Requesting sync after reconnection...');
                this.#channel.send({
                    type: 'broadcast',
                    event: 'lt_sync',
                    payload: { 
                        type: 'request', 
                        docId: this.docId, 
                        version: this.version, 
                        clientId: this.clientId, 
                        userId: this.userId,
                        requesterId: this.clientId
                    }
                });
            }
        }, 100);
    }

    #handleConnectionLoss() {
        // Reset sync state
        this.lastSyncResponseTimestamp = null;
        
        // Attempt to reconnect using subscribeReady with built-in retry logic
        this.subscribeReady(); // Will automatically retry with backoff
    }

    #setupChannelEventHandlers() {
        this.#channel.on('broadcast', { event: 'lt_patch' }, ({ payload }) => {
            this.applyPatch(payload.patch);
        });
        this.#channel.on('broadcast', { event: 'lt_typing' }, ({ payload }) => {
            this.dispatchEvent(new CustomEvent('typing', { detail: { typing: payload.typing } }));
        });
        this.#channel.on('broadcast', { event: 'lt_sync' }, ({ payload }) => {
            if (payload.docId !== this.docId) return;
            
            if (payload.type === 'request' && payload.requesterId !== this.clientId) {
                // Respond to sync requests from other clients
                setTimeout(async () => {
                    const ok = await this.#channel.send({
                        type: 'broadcast',
                        event: 'lt_sync',
                        payload: {
                            type: 'response',
                            docId: this.docId,
                            version: this.version || new Date().toISOString(),
                            text: this.text,
                            clientId: this.clientId,
                            userId: this.userId,
                            targetId: payload.requesterId,
                            timestamp: Date.now()
                        }
                    });
                }, Math.random() * 100); 
            } else if (payload.type === 'response' && payload.targetId === this.clientId) {
                this.#handleSyncResponse(payload);
            }
        });

        // Listen for connection state changes
        this.#channel.on('system', {}, ({ event, payload }) => {
            this.#handleConnectionStateChange(event, payload);
        });
    }
    
    createPatch() {
        const dmp = new DiffMatchPatch();
        const diffs = dmp.diff_main(this.#canonical, this.text);
        dmp.diff_cleanupEfficiency(diffs);
        const patches = dmp.patch_make(this.#canonical, diffs);
        return dmp.patch_toText(patches);
    }
    
    applyPatch(patchText) {
        const dmp = new DiffMatchPatch();
        if (!patchText) return true;
        
        let localDelta = null;
        if (this.#dirty) {
            localDelta = dmp.patch_make(this.#canonical, this.text); // V0 -> V1
        }
        
        const remotePatches = dmp.patch_fromText(patchText);
        const [canonAfter, remoteOkArr] = dmp.patch_apply(remotePatches, this.#canonical);
        const remoteOk = remoteOkArr.every(Boolean);
        if (!remoteOk) {
            // remote patch didn’t cleanly apply → bail 
            throw new Error('Failed to apply remote patch cleanly');
        }
        
        this.#canonical = canonAfter;
        
        if (localDelta) {
            const [rebasedText, localOkArr] = dmp.patch_apply(localDelta, this.#canonical);
            const localOk = localOkArr.every(Boolean);
            if (!localOk) {
                this.text = this.#canonical;
                this.#dirty = false; // we discarded local unsent changes
                return false;
            }
            this.text = rebasedText;
            this.#dirty = true;
            this.update(this.text);
        } else {
            this.text = this.#canonical;
            this.#dirty = false;
            this.#setTyping(false); 
        }
        
        this.version = new Date().toISOString();
        this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
        
        return true;
    }
    
    update(newText) {
        if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
        this.#dirty = true;
        this.#setTyping(true);          
        this.text = newText;
        this.#debounceTimer = setTimeout(async () => {
            const patch = this.createPatch();
            if (patch === '') {
                this.#dirty = false;
                this.#setTyping(false);
                return; 
            }
            
            // Check if channel is available and connected
            if (!this.#channel || this.#channel.state !== 'joined') {
                this.#canonical = this.text;
                this.version = new Date().toISOString();
                this.#dirty = false;
                this.#setTyping(false);
                return;
            }
            
            const ok = await this.#channel.send({
                type: 'broadcast',
                event: 'lt_patch',
                payload: {
                    docId: this.docId,
                    patch,
                    userId: this.userId,
                    clientId: this.clientId
                }
            });
            if (!ok) {
                console.warn(`[LiveText] Failed to send patch for ${this.docId}`);
                return
            }
            this.#canonical = this.text;
            this.version = new Date().toISOString();
            this.#dirty = false;
            this.#setTyping(false);
        }, this.debounce);
    }
    
    get isTyping() { return this.#typing; }
    
    #setTyping(flag) {
        if (this.#typing === flag) return;
        
        // Only send typing indicator if channel is connected
        if (this.#channel && this.#channel.state === 'joined') {
            this.#channel.send({
                type: 'broadcast',
                event: 'lt_typing',
                payload: { docId: this.docId, typing: flag, clientId: this.clientId, userId: this.userId }
            });
        }
        
        this.#typing = flag;
        
        // ensure we send a "not typing" event if patch debounce never fires for some reason
        // (probably unnecessary).
        if (flag) {
            if (this.#typingIdle) clearTimeout(this.#typingIdle);
            this.#typingIdle = setTimeout(() => this.#setTyping(false), 1200);
        } else {
            if (this.#typingIdle) clearTimeout(this.#typingIdle);
            this.#typingIdle = null;
        }
    }
    
    // is a before b
    isBefore(a, b) {
        return (new Date(a)) < (new Date(b));
    }

    waitUntilReady() {
        return new Promise((resolve) => {
            this.#channel.on('system', { event: '*' }, ({ payload }) => {
                if (payload.presence_ref === null) resolve();
            });
        });
    }

    // subscribe will resolve in a "joinING" state, but we want to wait until "joinED" or 
    // we will miss early messages. 
    async subscribeReady(attempt = 0) {
        // Apply exponential backoff delay for retry attempts
        if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // 1s, 2s, 4s, 8s... max 30s
            console.log(`🔄 Attempting to connect LiveText (attempt ${attempt}) in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            // Always try to clean up existing channel (gracefully fail if not possible)
            if (this.#channel) {
                try {
                    this.#channel.unsubscribe();
                } catch (cleanupError) {
                    // Expected - ignore cleanup errors
                }
            }
            
            // Recreate channel with same configuration
            this.#channel = this.supabase.channel(`${this.docId}`, {
                config: { broadcast: { self: false, ack: true } }
            });
            
            // Setup event handlers
            this.#setupChannelEventHandlers();

            // Debug: Simulate slow connection
            if (LiveText.DEBUG_DELAY_SUBSCRIBE) {
                console.log('🐛 DEBUG: Delaying channel subscribe by 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // Debug: Simulate connection failure
            if (LiveText.DEBUG_FAIL_SUBSCRIBE) {
                console.log('🐛 DEBUG: Simulating channel subscribe failure...');
                throw new Error('DEBUG: Simulated connection failure');
            }

            const sub = await this.#channel.subscribe();

            // Wait for connection to be established
            while (sub.state !== 'joined' && sub.state !== 'closed' && sub.state !== 'errored') {
                await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
            }

            if (sub.state === 'joined') {
                console.log(attempt > 0 ? '✅ LiveText reconnection successful' : "✅ Channel joined successfully");
                return sub;
            }

            // If we reach here, connection failed
            throw new Error(`Channel failed to connect: ${sub.state}`);
            
        } catch (error) {
            console.log(`⚠️ LiveText connection attempt ${attempt + 1} failed:`, error.message);
            
            // Always retry with incremented attempt - let caller decide if they want to stop
            return this.subscribeReady(attempt + 1);
        }
    }

    destroy() {
        if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
        this.#channel?.unsubscribe();
    }

}   