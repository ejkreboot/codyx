/**
 * Universal cell container with lifecycle management
 * 
 * A flexible cell component that can render different cell types (Python, R, Markdown)
 * through pluggable controllers. Handles cell execution, editing states, drag-and-drop
 * reordering, and provides consistent UI for all cell types.
 * 
 * @component CodyxCell
 * @example
 * <!-- Python cell -->
 * <CodyxCell 
 *   controller={pythonController}
 *   cellId="cell-001"
 *   index={0}
 *   on:execute={handleExecute}
 *   on:delete={handleDelete}
 * />
 * 
 * <!-- R cell with custom styling -->
 * <CodyxCell 
 *   controller={rController}
 *   cellId="cell-002" 
 *   index={1}
 *   focused={true}
 *   class="custom-cell-style"
 * />
 * 
 * <!-- Markdown cell in edit mode -->
 * <CodyxCell 
 *   controller={markdownController}
 *   cellId="cell-003"
 *   index={2}
 *   initiallyEditing={true}
 * />
 * 
 * @param {CellController} controller - Cell controller instance (Python, R, or Markdown)
 * @param {string} cellId - Unique identifier for this cell instance
 * @param {number} index - Position index in the notebook (0-based)
 * @param {boolean} [focused=false] - Whether this cell has focus for keyboard navigation
 * @param {boolean} [initiallyEditing=false] - Start the cell in editing mode
 * @param {boolean} [readOnly=false] - Prevent editing (sandbox mode)
 * @param {string} [class] - Additional CSS classes to apply
 * 
 * @fires CodyxCell#execute - Fired when cell execution is requested
 * @fires CodyxCell#delete - Fired when cell deletion is requested  
 * @fires CodyxCell#focus - Fired when cell gains focus
 * @fires CodyxCell#blur - Fired when cell loses focus
 * @fires CodyxCell#editStart - Fired when cell enters edit mode
 * @fires CodyxCell#editEnd - Fired when cell exits edit mode
 * @fires CodyxCell#moveUp - Fired when user requests to move cell up
 * @fires CodyxCell#moveDown - Fired when user requests to move cell down
 * @fires CodyxCell#insertAbove - Fired when user requests new cell above
 * @fires CodyxCell#insertBelow - Fired when user requests new cell below
 * 
 * @since 1.0.0
 */
export const CodyxCell = {};