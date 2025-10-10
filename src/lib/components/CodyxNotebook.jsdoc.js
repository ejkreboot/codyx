/**
 * Main notebook container and orchestrator
 * 
 * The primary component that manages an entire Codyx notebook, including
 * cell creation, deletion, reordering, persistence, collaboration, and
 * integration with various runtime services (Python, R, Markdown).
 * 
 * @component CodyxNotebook
 * @example
 * <!-- Basic notebook -->
 * <CodyxNotebook />
 * 
 * <!-- Notebook with specific slug -->
 * <CodyxNotebook slug="data-analysis-2024" />
 * 
 * <!-- Collaborative notebook -->
 * <CodyxNotebook 
 *   slug="team-project" 
 *   collaborative={true}
 *   userId="user-123"
 * />
 * 
 * <!-- Import Jupyter notebook -->
 * <CodyxNotebook 
 *   importFile={jupyterFile}
 *   onImportComplete={(notebook) => console.log('Imported:', notebook)}
 * />
 * 
 * @param {string} [slug] - Notebook identifier for persistence and collaboration
 * @param {boolean} [collaborative=false] - Enable real-time collaboration features
 * @param {string} [userId] - User identifier for collaboration and ownership
 * @param {File} [importFile] - Jupyter notebook (.ipynb) file to import
 * @param {boolean} [sandboxMode=false] - Run in sandbox mode (read-only, no persistence)
 * @param {string} [owner] - Owner identifier for shared notebooks
 * 
 * @fires CodyxNotebook#notebookLoad - Fired when notebook is loaded from database
 * @fires CodyxNotebook#notebookSave - Fired when notebook is saved to database
 * @fires CodyxNotebook#cellAdd - Fired when a new cell is added to the notebook
 * @fires CodyxNotebook#cellDelete - Fired when a cell is deleted from the notebook
 * @fires CodyxNotebook#cellReorder - Fired when cells are reordered via drag-and-drop
 * @fires CodyxNotebook#importComplete - Fired when Jupyter file import completes
 * @fires CodyxNotebook#collaborationSync - Fired when collaboration changes are synchronized
 * 
 * @since 1.0.0
 */
export const CodyxNotebook = {};