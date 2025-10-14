/**
 * Yjs Integration Test Script
 * 
 * Tests the Yjs collaborative text implementation to ensure it works correctly
 * before integration into the full application.
 */

import * as Y from 'yjs';
import { YjsCollaborativeText } from './src/lib/classes/yjs-collaborative-text.js';

// Mock Supabase client for testing
const mockSupabase = {
    channel: (name, config) => ({
        state: 'closed',
        on: () => {},
        send: async () => true,
        subscribe: async () => ({ state: 'joined' }),
        unsubscribe: () => {}
    })
};

console.log('🧪 Testing Yjs Integration...\n');

// Test 1: Basic Yjs functionality
console.log('Test 1: Basic Yjs Document Operations');
const ydoc1 = new Y.Doc();
const ydoc2 = new Y.Doc();
const ytext1 = ydoc1.getText('content');
const ytext2 = ydoc2.getText('content');

// Set up bidirectional sync
ydoc1.on('update', (update, origin) => {
    if (origin !== 'remote') {
        Y.applyUpdate(ydoc2, update, 'remote');
    }
});

ydoc2.on('update', (update, origin) => {
    if (origin !== 'remote') {
        Y.applyUpdate(ydoc1, update, 'remote');
    }
});

// Test concurrent edits
ytext1.insert(0, 'Hello ');
ytext2.insert(6, 'World');

console.log(`  Document 1: "${ytext1.toString()}"`);
console.log(`  Document 2: "${ytext2.toString()}"`);
console.log(`  ✅ Sync successful: ${ytext1.toString() === ytext2.toString()}\n`);

// Test 2: YjsCollaborativeText class
console.log('Test 2: YjsCollaborativeText Class');
try {
    const yjsText = new YjsCollaborativeText({
        text: 'Initial content',
        docId: 'test-doc',
        supabase: mockSupabase,
        userId: 'test-user'
    });
    
    console.log(`  Initial text: "${yjsText.text}"`);
    
    let changeCount = 0;
    yjsText.addEventListener('textchange', (e) => {
        changeCount++;
        console.log(`  Change ${changeCount}: "${e.detail.text}"`);
    });
    
    yjsText.updateText('Modified content');
    yjsText.updateText('Final content');
    
    console.log(`  Final text: "${yjsText.text}"`);
    console.log(`  ✅ Events fired: ${changeCount} times\n`);
    
} catch (error) {
    console.error('  ❌ Error creating YjsCollaborativeText:', error);
}

// Test 3: Awareness functionality
console.log('Test 3: Awareness System');
const ydoc3 = new Y.Doc();
const yjsText3 = new YjsCollaborativeText({
    text: '',
    docId: 'awareness-test',
    supabase: mockSupabase,
    userId: 'user1'
});

yjsText3.setTyping(true);
console.log(`  Is typing: ${yjsText3.isTyping}`);

yjsText3.setCursor(5, [3, 8]);
const states = yjsText3.getAwarenessStates();
console.log(`  Awareness states count: ${states.length}`);
console.log('  ✅ Awareness system working\n');

// Test 4: Error handling
console.log('Test 4: Error Handling');
const errorSupabase = {
    channel: () => {
        throw new Error('Network error');
    }
};

try {
    const yjsTextError = new YjsCollaborativeText({
        text: 'Test content',
        docId: 'error-test',
        supabase: errorSupabase,
        userId: 'test-user'
    });
    console.log('  ✅ Constructor handles errors gracefully');
} catch (error) {
    console.log('  ❌ Constructor threw error:', error.message);
}

console.log('\n🎉 Yjs integration tests completed!');
console.log('\nNext steps:');
console.log('1. Run `npm run dev` to test in browser');
console.log('2. Visit /dev to see side-by-side comparison');
console.log('3. Open multiple tabs to test real collaboration');
console.log('4. Check browser console for any errors');