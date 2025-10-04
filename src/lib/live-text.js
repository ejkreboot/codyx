import DiffMatchPatch from 'diff-match-patch';

// usage: const lt = await LiveText.create(initialText, docId, supabase, userId);
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
            
        this.#channel.on('broadcast', { event: 'lt_patch' }, ({ payload }) => {
            console.log(`[LiveText] Received patch for ${this.docId}:`, payload.patch.slice(0, 100));
            this.applyPatch(payload.patch);
        });
        this.#channel.on('broadcast', { event: 'lt_typing' }, ({ payload }) => {
            console.log(`[LiveText] Received typing for ${this.docId}:`, payload.typing);
            this.dispatchEvent(new CustomEvent('typing', { detail: { typing: payload.typing } }));
        });
        this.#channel.on('broadcast', { event: 'lt_sync' }, ({ payload }) => {
            if (payload.docId !== this.docId) return;
            
            const mine = new Date(this.version || 0);
            const theirs = new Date(payload.version || 0);
            
            if (payload.type === 'request' && mine > theirs) {
                setTimeout(async () => {
                    const ok = await this.#channel.send({
                    type: 'broadcast',
                    event: 'lt_sync',
                    payload: {
                        type: 'full',
                        docId: this.docId,
                        version: this.version || new Date().toISOString(),
                        text: this.text,
                        clientId: this.clientId,
                        userId: this.userId
                    }
                    });
                }, Math.random() * 100); 
            } else if (payload.type === 'full') {
                if (mine > theirs) return; // we're newer ... ignore
                this.#canonical = payload.text;
                this.text = payload.text;
                this.#dirty = false;
                this.version = payload.version;
                this.#setTyping(false);
                this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
            }
        });        

        const sub = await this.subscribeReady(); // wait until we're really, truly joined.
       
        // get any edited live content in other sessions
        this.#channel.send({
            type: 'broadcast',
            event: 'lt_sync',
            payload: { type: 'request', docId: this.docId, version: this.version, clientId: this.clientId, userId: this.userId }
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
        console.log(`[LiveText] Update called for ${this.docId}:`, newText.slice(0, 50) + '...');
        if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
        this.#dirty = true;
        this.#setTyping(true);          
        this.text = newText;
        this.#debounceTimer = setTimeout(async () => {
            const patch = this.createPatch();
            console.log(`[LiveText] Created patch for ${this.docId}:`, patch.slice(0, 100));
            if (patch === '') {
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
            console.log(`[LiveText] Patch send result for ${this.docId}:`, ok);
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
        this.#channel.send({
            type: 'broadcast',
            event: 'lt_typing',
            payload: { docId: this.docId, typing: flag, clientId: this.clientId, userId: this.userId }
        });
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
    async subscribeReady() {
        const sub = await this.#channel.subscribe();

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
                resolve(sub);
            }
            }, 10); // check every 10ms
        });
    }

    destroy() {
        if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
        this.#channel?.unsubscribe();
    }

}   