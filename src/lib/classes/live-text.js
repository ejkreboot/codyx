import { diff3Merge } from 'node-diff3';

// LiveText now provides optimistic locking and 3-way merge help for cells.
// It broadcasts "cell_updated" after saves and listens for remote updates to mark stale/refresh.
export class LiveText extends EventTarget {
    #channel = null;
    #typing = false;
    #typingIdle = null;
    #status = 'clean'; // clean | dirty | saving | stale | conflict | error
    #connectionState = 'disconnected';
    #baseText = '';
    #pendingRemote = null;
    initialized = false;
    clientId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

    constructor({ text = '', docId, supabase, userId = null, version = 1 }) {
        super();
        this.text = text;
        this.docId = docId;
        this.userId = userId;
        this.supabase = supabase;
        this.version = Number.isInteger(version) ? version : 1;
        this.#baseText = text ?? '';
    }

    static async create({ text, docId, supabase, userId = null, version = 1 }) {
        const lt = new LiveText({ text, docId, supabase, userId, version });
        await lt.init();
        return lt;
    }

    async init() {
        if (this.initialized) return;
        if (this.supabase) {
            await this.#setupChannel();
        }
        this.initialized = true;
    }

    // ---------- Public API ----------

    update(newText) {
        this.text = newText;
        this.#setStatus('dirty');
        this.#sendTyping(true);
    }

    async save() {
        if (!this.supabase) {
            this.#setStatus('error', 'Supabase client is not configured');
            return { success: false, error: 'supabase_missing' };
        }

        this.#setStatus('saving');
        const expectedVersion = this.version ?? 1;

        const { data, error } = await this.supabase.rpc('save_cell', {
            p_cell_id: this.docId,
            p_expected_version: expectedVersion,
            p_content: this.text
        });

        if (error) {
            this.#setStatus('error', error.message);
            return { success: false, error: error.message };
        }

        if (data?.success) {
            this.version = data.new_version ?? expectedVersion + 1;
            this.#baseText = this.text;
            this.#setStatus('clean');
            this.#broadcastUpdate();
            return { success: true, version: this.version };
        }

        if (data?.conflict) {
            const serverContent = data.server_content ?? '';
            const serverVersion = data.server_version ?? expectedVersion;

            // Keep previous base for a 3-way merge so we don't drop remote edits.
            const previousBase = this.#baseText;
            this.version = serverVersion;

            const mergeAttempt = this.#attemptAutoMerge(previousBase, serverContent);
            if (mergeAttempt.success) {
                this.#baseText = serverContent;
                this.text = mergeAttempt.merged ?? '';
                this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
                return this.save();
            }

            const conflictDetail = {
                serverContent,
                serverVersion,
                mergeChunks: mergeAttempt.chunks
            };

            this.#setStatus('conflict', 'Remote changes detected');
            this.dispatchEvent(new CustomEvent('conflict', { detail: conflictDetail }));
            return { success: false, conflict: true, ...conflictDetail };
        }

        this.#setStatus('error', 'Unknown response');
        return { success: false, error: 'unknown_response' };
    }

    applyServerContent(content, version) {
        this.#baseText = content ?? '';
        this.text = content ?? '';
        if (Number.isInteger(version)) {
            this.version = version;
        }
        this.#pendingRemote = null;
        this.#setStatus('clean');
        this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
    }

    markStaleAcknowledged() {
        if (this.#status === 'stale') {
            this.#setStatus('dirty');
        }
    }

    destroy() {
        if (this.#typingIdle) clearTimeout(this.#typingIdle);
        this.#channel?.unsubscribe();
    }

    get status() {
        return this.#status;
    }

    get connectionState() {
        return this.#connectionState;
    }

    // ---------- Internal helpers ----------

    #attemptAutoMerge(baseContent, serverContent) {
        const base = baseContent ?? '';
        const mine = this.text ?? '';
        const theirs = serverContent ?? '';

        const result = diff3Merge(mine, base, theirs, { stringSeparator: '\n' });
        const hasConflict = result.some(chunk => chunk.conflict);

        if (!hasConflict) {
            const merged = result.map(chunk => chunk.ok.join('\n')).join('\n');
            return { success: true, merged };
        }

        return { success: false, chunks: result };
    }

    async #setupChannel() {
        this.#channel = this.supabase.channel(`cell_${this.docId}`, {
            config: { broadcast: { self: false, ack: true } }
        });

        this.#channel.on('broadcast', { event: 'cell_updated' }, ({ payload }) => {
            this.#handleRemoteUpdate(payload);
        });

        this.#channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload?.clientId === this.clientId) return;
            this.dispatchEvent(new CustomEvent('typing', {
                detail: {
                    typing: payload?.typing,
                    clientId: payload?.clientId,
                    userId: payload?.userId,
                    source: 'remote'
                }
            }));
        });

        this.#channel.on('system', {}, ({ event }) => {
            this.#handleConnectionStateChange(event);
        });

        await this.#subscribeReady();
    }

    async #subscribeReady(attempt = 0) {
        this.#setConnectionState('connecting');

        if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            const sub = await this.#channel.subscribe();
            while (sub.state !== 'joined' && sub.state !== 'closed' && sub.state !== 'errored') {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (sub.state === 'joined') {
                this.#setConnectionState('connected');
                return sub;
            }
            throw new Error(`Channel failed to connect: ${sub.state}`);
        } catch (err) {
            return this.#subscribeReady(attempt + 1);
        }
    }

    #handleConnectionStateChange(event) {
        switch (event) {
            case 'JOINED':
                this.#setConnectionState('connected');
                break;
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                this.#setConnectionState('disconnected');
                this.#subscribeReady();
                break;
        }
    }

    #setConnectionState(newState) {
        if (this.#connectionState === newState) return;
        this.#connectionState = newState;
        this.dispatchEvent(new CustomEvent('connectionchange', {
            detail: { state: newState }
        }));
    }

    #handleRemoteUpdate(payload) {
        if (!payload || payload.docId !== this.docId) return;
        const incomingVersion = payload.version ?? 0;
        const currentVersion = this.version ?? 0;

        if (incomingVersion <= currentVersion) return;

        if (this.#status === 'dirty' || this.#status === 'saving') {
            this.#pendingRemote = {
                version: incomingVersion,
                content: payload.content ?? ''
            };
            this.#setStatus('stale');
            this.dispatchEvent(new CustomEvent('stale', { detail: { version: incomingVersion, content: payload.content ?? '' } }));
            return;
        }

        this.version = incomingVersion;
        this.#baseText = payload.content ?? '';
        this.text = payload.content ?? '';
        this.#pendingRemote = null;
        this.#setStatus('clean');
        this.dispatchEvent(new CustomEvent('patched', { detail: { text: this.text } }));
    }

    #broadcastUpdate() {
        if (!this.#channel || this.#channel.state !== 'joined') return;
        this.#channel.send({
            type: 'broadcast',
            event: 'cell_updated',
            payload: {
                docId: this.docId,
                version: this.version,
                content: this.text,
                userId: this.userId,
                clientId: this.clientId
            }
        });
    }

    #sendTyping(flag) {
        if (this.#typing === flag) return;
        this.#typing = flag;

        if (this.#channel && this.#channel.state === 'joined') {
            this.#channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { docId: this.docId, typing: flag, clientId: this.clientId, userId: this.userId }
            });
        }

        if (flag) {
            if (this.#typingIdle) clearTimeout(this.#typingIdle);
            this.#typingIdle = setTimeout(() => this.#sendTyping(false), 1200);
        } else {
            if (this.#typingIdle) clearTimeout(this.#typingIdle);
            this.#typingIdle = null;
        }

        this.dispatchEvent(new CustomEvent('typing', {
            detail: {
                typing: flag,
                clientId: this.clientId,
                userId: this.userId,
                source: 'local'
            }
        }));
    }

    #setStatus(status, message = null) {
        this.#status = status;
        this.dispatchEvent(new CustomEvent('statuschange', {
            detail: {
                status,
                message,
                dirty: status === 'dirty',
                stale: status === 'stale',
                saving: status === 'saving'
            }
        }));
        if (status !== 'dirty' && status !== 'saving') {
            this.#sendTyping(false);
        }
    }

    get pendingRemote() {
        return this.#pendingRemote;
    }
}