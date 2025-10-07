import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Notebook } from '$lib/classes/notebook.js';
import { supabase } from '$lib/util/supabase-client.js';

describe('Notebook', () => {
  let testSlug;

  beforeEach(async () => {
    // Generate a unique slug for each test run
    testSlug = 'test-notebook-' + Math.random().toString(36).slice(2, 8);
    // Clean up any existing notebook with this slug
    await supabase.from('notebooks').delete().eq('slug', testSlug);
  });

  afterEach(async () => {
    // Clean up after each test
    await supabase.from('notebooks').delete().eq('slug', testSlug);
  });

  it('should create a new notebook', async () => {
    const nb = await Notebook.create(testSlug);
    expect(nb).toBeDefined();
    expect(nb.slug).toBe(testSlug);
    expect(nb.id).toBeTruthy();
  });

  it('should check if a slug is available', async () => {
    const nb = await Notebook.create(testSlug);
    // This slug is not used, so should be available
    const available = await nb.checkIfSlugAvailable('some-unused-slug');
    expect(available).toBe(true);

    // This notebook's own slug is available to itself
    const selfAvailable = await nb.checkIfSlugAvailable(testSlug);
    expect(selfAvailable).toBe(true);

    // But for a different notebook, the slug is not available
    const nb2 = await Notebook.create('another-slug-' + Math.random().toString(36).slice(2, 8));
    const notAvailable = await nb2.checkIfSlugAvailable(testSlug);
    expect(notAvailable).toBe(false);
  });

  it('should rename a notebook', async () => {
    const nb = await Notebook.create(testSlug);
    const originalId = nb.id;
    const newSlug = 'renamed-' + Math.random().toString(36).slice(2, 8);
    
    await nb.rename(newSlug);
    
    // Verify the notebook object is updated
    expect(nb.slug).toBe(newSlug);
    
    // Verify the original slug no longer exists in database
    const { data: originalData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('slug', testSlug);
    expect(originalData.length).toBe(0);
    
    // Verify the new slug exists and has the same ID
    const { data: newData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('slug', newSlug);
    expect(newData.length).toBe(1);
    expect(newData[0].id).toBe(originalId);
    
    // Clean up the renamed notebook
    await supabase.from('notebooks').delete().eq('slug', newSlug);
  });

  it('should create and manage cells', async () => {
    const nb = await Notebook.create(testSlug);
    
    // Should start with a welcome cell
    const initialCells = await nb.getCells();
    expect(initialCells.length).toBeGreaterThan(0);
    
    // Add a new cell
    const newCell = await nb.upsertCell({
      content: 'Test cell content',
      type: 'md',
      position: 'z' // Should sort after initial cell
    });
    expect(newCell).toBeDefined();
    expect(newCell.content).toBe('Test cell content');
    
    // Get all cells and verify
    const allCells = await nb.getCells();
    expect(allCells.length).toBe(initialCells.length + 1);
    
    // Update the cell
    const updatedCell = await nb.upsertCell({
      id: newCell.id,
      content: 'Updated content',
      type: 'md',
      position: newCell.position
    });
    expect(updatedCell.content).toBe('Updated content');
    
    // Delete the cell
    await nb.deleteCell(newCell.id);
    const finalCells = await nb.getCells();
    expect(finalCells.length).toBe(initialCells.length);
  });

  it('should handle sandbox functionality', async () => {
    const nb = await Notebook.create(testSlug);
    
    // Should have a sandbox slug
    expect(nb.sandboxSlug).toBeTruthy();
    expect(nb.isSandbox).toBe(false);
    
    // Should be able to get sandbox URL
    const sandboxUrl = nb.getSandboxUrl();
    expect(sandboxUrl).toContain(nb.sandboxSlug);
    
    // Should be able to get main URL
    const mainUrl = nb.getMainUrl();
    expect(mainUrl).toContain(nb.slug);
  });

  it('should rename sandbox slug', async () => {
    const nb = await Notebook.create(testSlug);
    const originalSandboxSlug = nb.sandboxSlug;
    const originalMainSlug = nb.slug;
    const notebookId = nb.id;
    
    const newSandboxSlug = 'new-sandbox-' + Math.random().toString(36).slice(2, 8);
    
    await nb.renameSandbox(newSandboxSlug);
    
    // Verify the notebook object is updated
    expect(nb.sandboxSlug).toBe(newSandboxSlug);
    expect(nb.slug).toBe(originalMainSlug); // Main slug should not change
    
    // Verify in database - should find notebook by new sandbox slug
    const { data: bySandbox } = await supabase
      .from('notebooks')
      .select('*')
      .eq('sandbox_slug', newSandboxSlug);
    expect(bySandbox.length).toBe(1);
    expect(bySandbox[0].id).toBe(notebookId);
    expect(bySandbox[0].slug).toBe(originalMainSlug);
    
    // Verify original sandbox slug no longer exists
    const { data: originalSandboxData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('sandbox_slug', originalSandboxSlug);
    expect(originalSandboxData.length).toBe(0);
    
    // Verify main slug still exists and points to same notebook
    const { data: mainSlugData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('slug', originalMainSlug);
    expect(mainSlugData.length).toBe(1);
    expect(mainSlugData[0].id).toBe(notebookId);
    expect(mainSlugData[0].sandbox_slug).toBe(newSandboxSlug);
  });

  it('should create a copy of a notebook', async () => {
    const nb = await Notebook.create(testSlug);
    const originalId = nb.id;
    
    // Add some content to copy
    await nb.upsertCell({
      content: 'Original content',
      type: 'md',
      position: 'z'
    });
    
    const copySlug = 'copy-' + Math.random().toString(36).slice(2, 8);
    const result = await nb.createCopy(copySlug);
    expect(result).toBe(copySlug);
    
    // Verify the original notebook still exists
    const { data: originalData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('slug', testSlug);
    expect(originalData.length).toBe(1);
    expect(originalData[0].id).toBe(originalId);
    
    // Verify the copy exists as a separate notebook
    const { data: copyData } = await supabase
      .from('notebooks')
      .select('*')
      .eq('slug', copySlug);
    expect(copyData.length).toBe(1);
    expect(copyData[0].id).not.toBe(originalId); // Different notebook
    
    // Verify the copy has the same content
    const copyNb = await Notebook.create(copySlug);
    const originalCells = await nb.getCells();
    const copyCells = await copyNb.getCells();
    
    expect(copyCells.length).toBe(originalCells.length);
    expect(copyCells.some(cell => cell.content === 'Original content')).toBe(true);
    
    // Clean up the copy
    await supabase.from('notebooks').delete().eq('slug', copySlug);
  });

  it('should destroy notebook and cleanup', async () => {
    const nb = await Notebook.create(testSlug);
    const notebookId = nb.id;
    
    await nb.destroy();
    
    // Verify the notebook still exists in DB (destroy doesn't delete, just cleanup)
    const { data } = await supabase.from('notebooks').select('id').eq('id', notebookId);
    expect(data.length).toBe(1);
    
    // Verify initialized flag is reset
    expect(nb.initialized).toBe(false);
    
    // Verify channel is cleaned up (if it exists)
    expect(nb.channel).toBeNull();
    
    // Verify cellsStore is cleared
    let currentCells;
    nb.cellsStore.subscribe(cells => currentCells = cells)();
    expect(currentCells).toEqual([]);
  });
});