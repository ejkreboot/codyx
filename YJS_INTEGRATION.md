# Yjs Collaborative Text Integration

This document explains the new Yjs-based collaborative text editing system that can replace the existing LiveText implementation in CodyxCell.svelte.

## Overview

The Yjs implementation provides superior real-time collaborative editing using Conflict-free Replicated Data Types (CRDTs) instead of Operational Transform (OT). This results in better conflict resolution and more reliable collaborative editing.

## Key Benefits

### 🚀 **Yjs CRDT Advantages**
- **Automatic conflict resolution**: No manual patch merging required
- **True real-time sync**: Changes appear instantly across clients
- **Better merge algorithms**: Handles concurrent edits more intelligently
- **Offline support**: Works offline and syncs when reconnected
- **Awareness features**: Built-in support for cursors, selections, and typing indicators

### 📝 **LiveText OT (Current)**
- **Diff-based patches**: Uses diff-match-patch for operational transformation
- **Manual conflict resolution**: Requires careful handling of concurrent edits
- **Supabase transport**: Already integrated with existing infrastructure

## Usage

### Drop-in Replacement

The new Yjs implementation provides a compatibility layer that matches the LiveText API exactly:

```javascript
// Instead of:
import { LiveText } from '$lib/classes/live-text.js';

// Use:
import { LiveText } from '$lib/classes/live-text-yjs.js';
```

### CodyxCell Integration

CodyxCell now accepts a `useYjs` prop to control which implementation to use:

```svelte
<!-- Use original LiveText (OT) -->
<CodyxCell 
    initialText="Hello World"
    type="md"
    docId="test-cell"
    useYjs={false}
/>

<!-- Use new Yjs CRDT -->
<CodyxCell 
    initialText="Hello World"
    type="md"
    docId="test-cell"
    useYjs={true}
/>
```

### Visual Indicators

- Cells using Yjs show a small blue "Y" indicator in the top-right corner
- Cell tooltips indicate which system is being used
- Connection status shows both the connection state and collaboration system

## Testing

Visit `/dev` to see a side-by-side comparison of both implementations:

1. **Live Demo**: Both systems running simultaneously
2. **Multi-tab Testing**: Open multiple browser tabs to test collaboration
3. **Concurrent Editing**: Type in both cells from different tabs to see the differences
4. **Performance Comparison**: Observe how each system handles conflicts

## API Reference

### YjsCollaborativeText Class

The core Yjs implementation with full CRDT features:

```javascript
const yjsText = await YjsCollaborativeText.create({
    text: 'Initial content',
    docId: 'unique-document-id',
    supabase: supabaseClient,
    userId: 'user-123',
    debounce: 100  // Lower latency than LiveText
});

// Listen for changes
yjsText.addEventListener('textchange', (e) => {
    console.log('New text:', e.detail.text);
});

// Update text (automatically syncs)
yjsText.updateText('New content');

// Advanced features
yjsText.setCursor(position, selection);  // Collaborative cursors
yjsText.setTyping(true);                 // Typing indicators
yjsText.getAwarenessStates();           // All user states
```

### LiveTextYjs Class (Compatibility Layer)

Drop-in replacement for existing LiveText code:

```javascript
const liveText = await LiveTextYjs.create({
    text: 'Initial content',
    docId: 'unique-document-id', 
    supabase: supabaseClient,
    userId: 'user-123'
});

// Same API as original LiveText
liveText.update('New content');
liveText.addEventListener('patched', handler);
liveText.addEventListener('typing', handler);
```

## Network Protocol

### Supabase Channel Events

The Yjs implementation uses Supabase realtime channels with these events:

- `yjs_update`: Document updates (binary Yjs format)
- `yjs_awareness`: User awareness (cursors, typing, selections)  
- `yjs_sync`: Document synchronization (request/response)
- `yjs_heartbeat`: Connection health monitoring

### Channel Naming

Channels are named `yjs_{docId}` to avoid conflicts with existing LiveText channels.

## Migration Strategy

### Gradual Rollout

1. **Development**: Test with `useYjs={true}` on dev page
2. **Feature Flag**: Add notebook-level or user-level preferences
3. **A/B Testing**: Compare performance and user experience
4. **Full Migration**: Switch default to Yjs when ready

### Backwards Compatibility

Both systems can coexist:
- Existing LiveText channels continue working
- New Yjs channels use different event names
- No data migration required

## Performance Characteristics

| Feature | LiveText (OT) | Yjs (CRDT) |
|---------|---------------|------------|
| Conflict Resolution | Manual | Automatic |
| Concurrent Edits | Can lose data | Always preserves intent |
| Network Efficiency | Diff patches | Binary updates |
| Memory Usage | Lower | Higher (document history) |
| Offline Support | Limited | Full support |
| Cursor Awareness | Basic typing indicator | Full cursors & selections |

## Dependencies

New packages added:
- `yjs`: Core CRDT library
- `y-websocket`: WebSocket provider (though we use Supabase transport)

## Error Handling

The Yjs implementation includes robust error handling:
- Network failures gracefully degrade to local-only mode
- Malformed updates are logged but don't crash the system
- Automatic reconnection with exponential backoff
- Heartbeat monitoring for connection health

## Future Enhancements

Possible future improvements:
- **Collaborative Cursors**: Show other users' cursor positions and selections
- **Undo/Redo**: Leverage Yjs's built-in undo manager
- **Persistence**: Store Yjs documents in Supabase database
- **Compression**: Compress large documents for better performance
- **Plugins**: Add Yjs plugins for rich text, tables, etc.

## Troubleshooting

### Common Issues

1. **"Y is not defined"**: Ensure Yjs package is installed
2. **Channel connection fails**: Check Supabase credentials and network
3. **Updates not syncing**: Verify channel names and event handlers
4. **High memory usage**: Yjs keeps document history; consider periodic cleanup

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('yjs-debug', 'true');
```

This will log all Yjs operations to the browser console.