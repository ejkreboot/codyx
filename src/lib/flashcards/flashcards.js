import { supabase } from "$lib/supabase-client";
import { writable, get } from 'svelte/store';
import Haikunator from "haikunator";

export class FlashCardDeck {
    isSandbox = true;
    cards = [];
    static haikunator = new Haikunator();

    constructor() {
        this.id = null;
        this.table = 'flashcards';
        this.slug = FlashCardDeck.haikunator.haikunate({tokenLength: 0});
        this.sandboxSlug = FlashCardDeck.haikunator.haikunate({tokenLength: 0});
        this.topic = '';
        this.description = '';
        this.user = null; // current user object
        this.cardsStore = writable([]);
        this.isSandbox = true;
        this.studyCards = this.getCardsForStudy();
        this.attemptedCardCount = 0;
    }

    static async create(requestedSlug, user = null, description = null, topic = null) {
        if (!requestedSlug) {
            throw new Error('Deck slug is required');
        }
        const self = new FlashCardDeck();
        self.slug = requestedSlug;
        self.user = user;
        self.topic = topic || '';
        self.description = description || '';
        const { data, error } = await supabase
            .from('flashcard_decks')
            .select('*')
            .or(`slug.eq."${requestedSlug}",sandbox_slug.eq."${requestedSlug}"`)
            .single();
        if (error && error.code !== 'PGRST116') { // Not a "no rows" error
            throw error;
        }

        if (data) {
            const isOwned = user && data.user_id === user;
            const isSandbox = requestedSlug === data.sandbox_slug;
            self.id = data.id;
            self.slug = data.slug;
            self.sandboxSlug = data.sandbox_slug;
            self.topic = data.topic;
            self.description = data.description;
            if (isSandbox) {
                self.isSandbox = true;
            } else {
                self.isSandbox = false;
            }

            self.cards = await self.getFlashcards(data.id);
            
            if (self.isSandbox) {
                self.cards = self.cards.map(card => ({
                    ...card,
                    weight: 1,
                    times_reviewed: 0
                }));
            }
        } else {
            self.slug = requestedSlug;
            self.sandboxSlug = await self.#generateUniqueSlug(); 
            const newDeck = await self.#addDeck(user, self.topic, self.description);
            self.isSandbox = false; 
            self.id = newDeck.id;
            self.topic = newDeck.topic;
            self.description = newDeck.description;
            await self.#addIntroCard();
        }

        self.cardsStore.set(self.cards || []);
        return self;
    }

    get cards() {
        return get(this.cardsStore);
    }

    /******************************************
     *  🔹 Intro Card & Deck Setup
    ******************************************/

    async #addIntroCard() {
        const introCard = {
            deck_id: this.id,
            question: "Welcome to Your Flashcard Deck! 🎯",
            answer: `This is your first card. Edit or delete it as you like!`,
            weight: 1,
            times_reviewed: 0
        };

        if (!this.isSandbox) {
            // Save to database for owned decks
            const savedCard = await this.upsertFlashcard(introCard);
            this.cards = [savedCard];
        } else {
            // Keep in memory for sandbox decks
            this.cards = [{ ...introCard, id: 'intro-' + Date.now() }];
        }
        this.cardsStore.set(this.cards);
    }

    /******************************************
     *  🔹 Deck CRUD 
    ******************************************/

    async getDecksByUser(user) {
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('flashcard_decks')
            .select('*')
            .eq('user_id', user);

        if (error) {
            console.error('Error fetching flashcard decks:', error);
            throw error;
        }
        return data;
    }

    async #addDeck(user, topic, description) {
        const { data, error } = await supabase
            .from('flashcard_decks')
            .insert([{ 
                user_id: user || null, 
                topic, 
                description, 
                slug: this.slug,
                sandbox_slug: this.sandboxSlug
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding flashcard deck:', error);
            throw error;
        }
        return data;
    }

    async deleteDeck(deckId) {
        if(this.isSandbox) return;
        const { data, error } = await supabase
            .from('flashcard_decks')
            .delete()
            .eq('id', deckId);

        if (error) {
            console.error('Error deleting flashcard deck:', error);
            throw error;
        }
        return data;
    }

    async updateDeck(deckId, updates) {
        if(this.isSandbox) return;
        const { data, error } = await supabase
            .from('flashcard_decks')
            .update(updates)
            .eq('id', deckId)
            .single();

        if (error) {
            console.error('Error updating flashcard deck:', error);
            throw error;
        }
        return data;
    }

    /******************************************
     *  🔹 SLUG management (yum!) 
    ******************************************/

    async #checkIfSlugAvailable(newSlug) {
        if (newSlug === this.slug) return true; // no change, so it's "available"
        
        const { data, error } = await supabase
            .from('flashcard_decks')
            .select('id')
            .or(`slug.eq.${newSlug},sandbox_slug.eq.${newSlug}`);
            
        if (error) {
            throw error;
        }
        
        return data && data.length === 0; // available if no rows found in either column
    }

    async #generateUniqueSlug() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const candidateSlug = FlashCardDeck.haikunator.haikunate({ tokenLength: 0 });
            
            // Check if this slug is available
            const { data, error } = await supabase
                .from('flashcard_decks')
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
        return `${FlashCardDeck.haikunator.haikunate({ tokenLength: 0 })}-${timestamp}`;
    }

    async rename(newSlug) {
        if (!newSlug) return;
        const isAvailable = await this.#checkIfSlugAvailable(newSlug);
        if (!isAvailable) {
            throw new Error('That name is already taken');
        }
        const { error } = await supabase
            .from('flashcard_decks')
            .update({ slug: newSlug })
            .eq('id', this.id);
        if (error) throw error;
        this.slug = newSlug;
    }

    async renameSandbox(newSlug) {
        if (!newSlug) return;

        const isAvailable = await this.#checkIfSlugAvailable(newSlug);
        if (!isAvailable) {
            throw new Error('That name is already taken');
        }
        const { error } = await supabase
            .from('flashcard_decks')
            .update({ sandbox_slug: newSlug })
            .eq('id', this.id);
        if (error) throw error;
        this.sandboxSlug = newSlug;
    }

    /******************************************
     *  🔹 Flash card CRUD 
    ******************************************/

    async getFlashcards(deckId) {
        const { data, error } = await supabase
            .from(this.table)
            .select('*')
            .eq('deck_id', deckId)
        if (error) {
            console.error('Error fetching flashcards:', error);
            throw error;
        }
        return data;
    }   

    async getFlashcard(flashcardId) {
        const { data, error } = await supabase
            .from(this.table)
            .select('*') 
            .eq('id', flashcardId)
            .single();

        if (error) {
            console.error('Error fetching flashcard:', error);
            throw error;
        }
        return data;
    }

    async upsertFlashcard(data) {
        if (this.isSandbox) {
            // Handle sandbox mode - store in memory
            const existingIndex = this.cards.findIndex(card => card.id === data.id);
            if (existingIndex >= 0) {
                this.cards[existingIndex] = { ...this.cards[existingIndex], ...data };
            } else {
                const newCard = { ...data, id: data.id || 'temp-' + Date.now() };
                this.cards.push(newCard);
            }
            this.cardsStore.set(this.cards);
            return data;
        }

        const { data: result, error } = await supabase
            .from(this.table)
            .upsert(data)
            .select()
            .single();

        if (error) {
            console.error('Error upserting flashcard:', error);
            throw error;
        }

        // Update local store
        await this.refreshCards();
        return result;
    }

    async addCard(question, answer) {
        const newCard = {
            deck_id: this.id,
            question: question.trim(),
            answer: answer.trim(),
            weight: 1,
            times_reviewed: 0
        };

        return await this.upsertFlashcard(newCard);
    }

    async updateCard(cardId, question, answer) {
        const cardIndex = this.cards.findIndex(card => card.id === cardId);

        if (cardIndex >= 0) {
            this.cards[cardIndex] = {
                ...this.cards[cardIndex],
                question: question.trim(),
                answer: answer.trim()
            };
            this.cardsStore.set(this.cards);
        } else {
            return null;
        }

        if (!this.isSandbox) {
            const { data, error } = await supabase
                .from(this.table)
                .update({
                    question: question.trim(),
                    answer: answer.trim()
                })
                .eq('id', cardId)
                .select()
                .single();

            if (error) {
                console.error('Error updating flashcard:', error);
                throw error;
            }
        }
        return this.cards[cardIndex];
    }

    async refreshCards() {
        if (!this.isSandbox) {
            this.cards = await this.getFlashcards(this.id);
            this.cardsStore.set(this.cards);
        }
    }

    async deleteFlashcard(flashcardId) {
        if (this.isSandbox) {
            // Handle sandbox mode - remove from memory only
            this.cards = this.cards.filter(card => card.id !== flashcardId);
            this.cardsStore.set(this.cards);
            return;
        }

        const { data, error } = await supabase
            .from(this.table)
            .delete()
            .eq('id', flashcardId);

        if (error) {
            console.error('Error deleting flashcard:', error);
            throw error;
        }
        
        // Update local store
        await this.refreshCards();
        return data;
    }

    /******************************************
     *  🔹 Spaced repetition weight calculation
    ******************************************/

    calc_weight(previous, evaluation) {
        if (previous == null) {
            previous = { n: 0, weight: 0.0 }
        }

        let weight = previous.weight;

        if(evaluation.score < 3) {
            weight = 1;
        } else if (evaluation.score < 5) {
            weight = 2 * Math.max(previous.weight,1);
            weight = Math.min(20, weight); // avoid crazy skews
        } else {
            weight = 4 * Math.max(previous.weight,1);
            weight = Math.min(20, weight);
        }
        return(weight);
    }

    /******************************************
     *  🔹 Study Session Utilities
    ******************************************/

    async reviewCard(cardId, score) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        const previous = { n: card.times_reviewed || 0, weight: card.weight || 1 };
        const newWeight = this.calc_weight(previous, { score });
        
        const updates = {
            weight: newWeight,
            times_reviewed: card.times_reviewed ? card.times_reviewed + 1 : 1
        };

        return await this.updateCardWeight(cardId, updates);
    }

    async updateCardWeight(cardId, updates) {
        if (this.isSandbox) {
            const cardIndex = this.cards.findIndex(card => card.id === cardId);
            if (cardIndex >= 0) {
                this.cards[cardIndex] = { ...this.cards[cardIndex], ...updates };
                this.cardsStore.set(this.cards);
                return this.cards[cardIndex];
            }
            return null;
        }

        const { data, error } = await supabase
            .from(this.table)
            .update(updates)
            .eq('id', cardId)
            .select()
            .single();

        if (error) {
            console.error('Error updating card weight:', error);
            throw error;
        }

        // Update local store
        await this.refreshCards();
        return data;
    }

    getCardsForStudy(limit = 20) {
        if (this.cards.length === 0) return [];
        
        // First priority: cards that need reinforcement (weight > 2)
        const reinforcementCards = this.cards.filter(card => {
            const weight = this.isSandbox ? 1 : (card.weight || 1);
            return weight > 2;
        });

        this.studyCards = [...reinforcementCards];

        // If we need more cards to reach the limit, add random selection from remaining cards
        if (this.studyCards.length < limit) {
            const remainingCards = this.cards.filter(card => {
                return !this.studyCards.find(sc => sc.id === card.id);
            });
            while (this.studyCards.length < limit && remainingCards.length > 0) {
                const randomIndex = Math.floor(Math.random() * remainingCards.length);
                this.studyCards.push(remainingCards.splice(randomIndex, 1)[0]);
            }
        }        
        return this.studyCards;
    }

    getNextCardForStudy(previousId = null) {
        if (!this.studyCards || this.studyCards.length === 0) {
            this.studyCards = this.getCardsForStudy();
        }
        if (this.studyCards.length === 0) {
            return null;
        }
        const averageWeight = this.studyCards.map(c => c.weight).reduce((a,b) => a+b, 0) / this.studyCards.length;
        if (averageWeight < 3 && this.attemptedCardCount > (1.5 * this.studyCards.length)) {
            this.attemptedCardCount = 0;
            this.studyCards = this.getCardsForStudy();
        }
        let attempts = 0;
        const cardArray = this.studyCards.map(c => Array(c.weight).fill(c)).flat();
        while(attempts < 10) {
            const randomIndex = Math.floor(Math.random() * cardArray.length);
            const selectedCard = cardArray[randomIndex];
            if (!previousId || selectedCard.id !== previousId) {
                return selectedCard;
            }
            attempts++;
        }
        return this.cards.find(c => c.id === previousId);
    }

    getSandboxUrl() {
        return `/flashcards?deck=${this.sandboxSlug}`;
    }

    getEditUrl() {
        return `/flashcards?deck=${this.slug}`;
    }
}
