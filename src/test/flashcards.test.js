import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writable, get } from 'svelte/store';
import { FlashCardDeck } from '$lib/flashcards/flashcards.js';
import { supabase } from '$lib/util/supabase-client.js';

describe('FlashCardDeck', () => {
  let testDeckIds = [];
  let testCardIds = [];
  
  // Helper function to generate unique test slug
  const generateTestSlug = () => `test-flashcard-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Clean up test data after each test
  afterEach(async () => {
    // Clean up test cards
    if (testCardIds.length > 0) {
      await supabase
        .from('flashcards')
        .delete()
        .in('id', testCardIds);
      testCardIds = [];
    }
    
    // Clean up test decks
    if (testDeckIds.length > 0) {
      await supabase
        .from('flashcard_decks')
        .delete()
        .in('id', testDeckIds);
      testDeckIds = [];
    }
  });

  describe('Constructor and Basic Properties', () => {
    it('should create a FlashCardDeck instance with default values', () => {
      const deck = new FlashCardDeck();
      
      expect(deck.id).toBeNull();
      expect(deck.table).toBe('flashcards');
      expect(deck.isSandbox).toBe(true);
      expect(deck.cards).toEqual([]);
      expect(deck.topic).toBe('');
      expect(deck.description).toBe('');
      expect(deck.user).toBeNull();
      expect(deck.attemptedCardCount).toBe(0);
      expect(deck.slug).toBeDefined();
      expect(deck.sandboxSlug).toBeDefined();
    });

    it('should have a reactive cards store', () => {
      const deck = new FlashCardDeck();
      
      expect(deck.cardsStore).toBeDefined();
      expect(get(deck.cardsStore)).toEqual([]);
      
      // Test that store updates work
      const testCards = [{ id: 1, question: 'Test?', answer: 'Yes' }];
      deck.cardsStore.set(testCards);
      expect(get(deck.cardsStore)).toEqual(testCards);
    });
  });

  describe('FlashCardDeck.create()', () => {
    it('should create a new deck when slug does not exist', async () => {
      const testSlug = generateTestSlug();
      const deck = await FlashCardDeck.create(testSlug, 'test-user', 'Test Description', 'Test Topic');
      
      testDeckIds.push(deck.id);
      
      expect(deck.slug).toBe(testSlug);
      expect(deck.topic).toBe('Test Topic');
      expect(deck.description).toBe('Test Description');
      expect(deck.user).toBe('test-user');
      expect(deck.isSandbox).toBe(false);
      expect(deck.id).toBeDefined();
      
      // Should have created intro card
      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].question).toContain('Welcome to Your Flashcard Deck');
    });

    it('should load existing deck when slug exists', async () => {
      // First create a deck
      const testSlug = generateTestSlug();
      const originalDeck = await FlashCardDeck.create(testSlug, 'test-user', 'Original Description', 'Original Topic');
      testDeckIds.push(originalDeck.id);
      
      // Now load it again
      const loadedDeck = await FlashCardDeck.create(testSlug, 'test-user');
      
      expect(loadedDeck.slug).toBe(testSlug);
      expect(loadedDeck.id).toBe(originalDeck.id);
      expect(loadedDeck.topic).toBe('Original Topic');
      expect(loadedDeck.description).toBe('Original Description');
      expect(loadedDeck.isSandbox).toBe(false);
    });

    it('should handle sandbox mode when accessing sandbox slug', async () => {
      // First create a deck
      const testSlug = generateTestSlug();
      const originalDeck = await FlashCardDeck.create(testSlug, 'test-user');
      testDeckIds.push(originalDeck.id);
      
      // Now access it via sandbox slug
      const sandboxDeck = await FlashCardDeck.create(originalDeck.sandboxSlug, 'different-user');
      
      expect(sandboxDeck.slug).toBe(testSlug);
      expect(sandboxDeck.sandboxSlug).toBe(originalDeck.sandboxSlug);
      expect(sandboxDeck.id).toBe(originalDeck.id);
      expect(sandboxDeck.isSandbox).toBe(true);
    });

    it('should throw error when slug is not provided', async () => {
      await expect(FlashCardDeck.create()).rejects.toThrow('Deck slug is required');
      await expect(FlashCardDeck.create('')).rejects.toThrow('Deck slug is required');
    });
  });

  describe('Card Management', () => {
    let deck;

    beforeEach(async () => {
      const testSlug = generateTestSlug();
      deck = await FlashCardDeck.create(testSlug, 'test-user');
      testDeckIds.push(deck.id);
    });

    describe('addCard()', () => {
      it('should add a new card with correct properties', async () => {
        const result = await deck.addCard('What is 2+2?', '4');
        testCardIds.push(result.id);

        expect(result.question).toBe('What is 2+2?');
        expect(result.answer).toBe('4');
        expect(result.weight).toBe(1);
        expect(result.times_reviewed).toBe(0);
        expect(result.deck_id).toBe(deck.id);
        
        // Verify it's in the deck's cards
        expect(deck.cards.some(card => card.id === result.id)).toBe(true);
      });

      it('should trim whitespace from question and answer', async () => {
        const result = await deck.addCard('  Trimmed?  ', '  Yes  ');
        testCardIds.push(result.id);

        expect(result.question).toBe('Trimmed?');
        expect(result.answer).toBe('Yes');
      });
    });

    describe('updateCard()', () => {
      let testCard;

      beforeEach(async () => {
        testCard = await deck.addCard('Old question', 'Old answer');
        testCardIds.push(testCard.id);
      });

      it('should update an existing card', async () => {
        const result = await deck.updateCard(testCard.id, 'New question', 'New answer');

        expect(result.question).toBe('New question');
        expect(result.answer).toBe('New answer');
        expect(result.id).toBe(testCard.id);
        
        // Check the card was updated in local store
        const updatedCard = deck.cards.find(card => card.id === testCard.id);
        expect(updatedCard.question).toBe('New question');
        expect(updatedCard.answer).toBe('New answer');
      });

      it('should return null for non-existent card', async () => {
        const result = await deck.updateCard(99999, 'Question', 'Answer');
        expect(result).toBeNull();
      });

      it('should handle sandbox mode without database calls', async () => {
        // Create a sandbox deck
        const sandboxSlug = generateTestSlug();
        const sandboxDeck = await FlashCardDeck.create(deck.sandboxSlug, 'different-user');
        
        // Add a card in sandbox mode (it should be in memory only)
        sandboxDeck.cards = [{ id: 'temp-123', question: 'Sandbox Q', answer: 'Sandbox A' }];
        sandboxDeck.cardsStore.set(sandboxDeck.cards);
        
        const result = await sandboxDeck.updateCard('temp-123', 'Updated Q', 'Updated A');

        expect(result.question).toBe('Updated Q');
        expect(result.answer).toBe('Updated A');
      });
    });

    describe('deleteFlashcard()', () => {
      let testCard1, testCard2;

      beforeEach(async () => {
        testCard1 = await deck.addCard('Question 1', 'Answer 1');
        testCard2 = await deck.addCard('Question 2', 'Answer 2');
        testCardIds.push(testCard1.id, testCard2.id);
      });

      it('should delete a card from database and update local store', async () => {
        const initialCardCount = deck.cards.length;
        
        await deck.deleteFlashcard(testCard1.id);
        
        // Remove from our test tracking since it's deleted
        testCardIds = testCardIds.filter(id => id !== testCard1.id);
        
        expect(deck.cards.length).toBe(initialCardCount - 1);
        expect(deck.cards.some(card => card.id === testCard1.id)).toBe(false);
        expect(deck.cards.some(card => card.id === testCard2.id)).toBe(true);
      });

      it('should handle sandbox mode by removing from memory only', async () => {
        // Create a sandbox deck
        const sandboxDeck = await FlashCardDeck.create(deck.sandboxSlug, 'different-user');
        
        // Add cards in memory for sandbox mode
        sandboxDeck.cards = [
          { id: 'temp-1', question: 'Q1', answer: 'A1' },
          { id: 'temp-2', question: 'Q2', answer: 'A2' }
        ];
        sandboxDeck.cardsStore.set(sandboxDeck.cards);
        
        await sandboxDeck.deleteFlashcard('temp-1');

        expect(sandboxDeck.cards).toHaveLength(1);
        expect(sandboxDeck.cards[0].id).toBe('temp-2');
      });
    });
  });

  describe('Spaced Repetition System', () => {
    let deck;

    beforeEach(() => {
      deck = new FlashCardDeck();
    });

    describe('calc_weight()', () => {
      it('should return weight 1 for poor performance (score < 3)', () => {
        const previous = { n: 2, weight: 5 };
        const evaluation = { score: 1 };
        
        const result = deck.calc_weight(previous, evaluation);
        expect(result).toBe(1);
      });

      it('should double weight for moderate performance (score 3-4)', () => {
        const previous = { n: 1, weight: 2 };
        const evaluation = { score: 3 };
        
        const result = deck.calc_weight(previous, evaluation);
        expect(result).toBe(4);
      });

      it('should quadruple weight for good performance (score 5)', () => {
        const previous = { n: 1, weight: 2 };
        const evaluation = { score: 5 };
        
        const result = deck.calc_weight(previous, evaluation);
        expect(result).toBe(8);
      });

      it('should cap weight at 20 to avoid extreme values', () => {
        const previous = { n: 3, weight: 10 };
        const evaluation = { score: 5 };
        
        const result = deck.calc_weight(previous, evaluation);
        expect(result).toBe(20); // Would be 40 without cap
      });

      it('should handle null previous state', () => {
        const result = deck.calc_weight(null, { score: 4 });
        expect(result).toBe(2); // 2 * max(0, 1) = 2
      });
    });

    describe('reviewCard()', () => {
      it('should update card weight and review count based on performance', async () => {
        // Create a new deck for this specific test to avoid pollution
        const testSlug = generateTestSlug();
        const testDeck = await FlashCardDeck.create(testSlug, 'test-user');
        testDeckIds.push(testDeck.id);
        
        const testCard = await testDeck.addCard('Review Test Question', 'Review Test Answer');
        testCardIds.push(testCard.id);
        
        // Make sure card has initial values we can test against
        expect(testCard.weight).toBe(1);
        expect(testCard.times_reviewed).toBe(0);
        
        const result = await testDeck.reviewCard(testCard.id, 4);

        expect(result).toBeDefined();
        expect(result.weight).toBe(2); // 2 * max(1, 1) = 2 for moderate performance
        expect(result.times_reviewed).toBe(1); // 0 + 1 = 1
      });

      it('should handle non-existent card gracefully', async () => {
        const result = await deck.reviewCard(99999, 5);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Study Session Management', () => {
    let deck;

    beforeEach(() => {
      deck = new FlashCardDeck();
      deck.cards = [
        { id: 1, question: 'Easy', answer: 'A1', weight: 1 },
        { id: 2, question: 'Medium', answer: 'A2', weight: 3 },
        { id: 3, question: 'Hard', answer: 'A3', weight: 5 },
        { id: 4, question: 'Normal', answer: 'A4', weight: 1 }
      ];
    });

    describe('getCardsForStudy()', () => {
      it('should prioritize cards with higher weights for reinforcement', () => {
        const studyCards = deck.getCardsForStudy(10);

        // Should include cards with weight > 2 first
        const highWeightCards = studyCards.filter(card => card.weight > 2);
        expect(highWeightCards).toHaveLength(2);
        expect(highWeightCards.map(c => c.id)).toEqual(expect.arrayContaining([2, 3]));
      });

      it('should fill remaining slots with random cards', () => {
        const studyCards = deck.getCardsForStudy(3);
        expect(studyCards).toHaveLength(3);
      });

      it('should handle empty deck gracefully', () => {
        deck.cards = [];
        const studyCards = deck.getCardsForStudy();
        expect(studyCards).toEqual([]);
      });

      it('should respect the limit parameter', () => {
        const studyCards = deck.getCardsForStudy(2);
        expect(studyCards.length).toBeLessThanOrEqual(2);
      });
    });

    describe('getNextCardForStudy()', () => {
      beforeEach(() => {
        deck.studyCards = deck.getCardsForStudy();
      });

      it('should return a card from study set', () => {
        const card = deck.getNextCardForStudy();
        expect(card).toBeDefined();
        expect(deck.studyCards.find(c => c.id === card.id)).toBeDefined();
      });

      it('should avoid returning the same card as previous', () => {
        const card1 = deck.getNextCardForStudy();
        const card2 = deck.getNextCardForStudy(card1.id);
        
        // Should be different if possible (with multiple cards available)
        if (deck.studyCards.length > 1) {
          expect(card2.id).not.toBe(card1.id);
        }
      });

      it('should handle empty study set', () => {
        deck.studyCards = [];
        deck.cards = [];
        const card = deck.getNextCardForStudy();
        expect(card).toBeNull();
      });
    });
  });

  describe('Deck Management', () => {
    let deck;

    beforeEach(async () => {
      const testSlug = generateTestSlug();
      deck = await FlashCardDeck.create(testSlug, 'test-user');
      testDeckIds.push(deck.id);
    });

    describe('rename()', () => {
      it('should rename deck when new slug is available', async () => {
        const originalSlug = deck.slug;
        const newSlug = generateTestSlug();

        await deck.rename(newSlug);

        expect(deck.slug).toBe(newSlug);
        
        // Verify in database
        const { data } = await supabase
          .from('flashcard_decks')
          .select('slug')
          .eq('id', deck.id)
          .single();
        
        expect(data.slug).toBe(newSlug);
      });

      it('should throw error when slug is taken', async () => {
        // Create another deck to conflict with
        const conflictSlug = generateTestSlug();
        const conflictDeck = await FlashCardDeck.create(conflictSlug, 'test-user');
        testDeckIds.push(conflictDeck.id);

        await expect(deck.rename(conflictSlug)).rejects.toThrow('That name is already taken');
      });
    });

    describe('deleteDeck()', () => {
      it('should delete deck when not in sandbox mode', async () => {
        const deckId = deck.id;
        
        await deck.deleteDeck(deckId);
        
        // Remove from our tracking since it's deleted
        testDeckIds = testDeckIds.filter(id => id !== deckId);
        
        // Verify it's deleted from database
        const { data } = await supabase
          .from('flashcard_decks')
          .select('id')
          .eq('id', deckId);
          
        expect(data).toHaveLength(0);
      });

      it('should not delete in sandbox mode', async () => {
        const sandboxDeck = await FlashCardDeck.create(deck.sandboxSlug, 'different-user');
        const deckId = deck.id;
        
        // In sandbox mode, delete should be a no-op
        await sandboxDeck.deleteDeck(deckId);
        
        // Verify it still exists in database
        const { data } = await supabase
          .from('flashcard_decks')
          .select('id')
          .eq('id', deckId)
          .single();
          
        expect(data.id).toBe(deckId);
      });
    });
  });

  describe('URL Generation', () => {
    let deck;

    beforeEach(async () => {
      const testSlug = generateTestSlug();
      deck = await FlashCardDeck.create(testSlug, 'test-user');
      testDeckIds.push(deck.id);
    });

    it('should generate correct sandbox URL', () => {
      const url = deck.getSandboxUrl();
      expect(url).toBe(`/flashcards?deck=${deck.sandboxSlug}`);
    });

    it('should generate correct edit URL', () => {
      const url = deck.getEditUrl();
      expect(url).toBe(`/flashcards?deck=${deck.slug}`);
    });
  });
});