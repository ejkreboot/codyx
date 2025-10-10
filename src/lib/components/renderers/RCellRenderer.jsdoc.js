/**
 * R statistical computing interface with WebR integration
 * 
 * Specialized cell renderer for R statistical computing with WebR runtime.
 * Provides R syntax highlighting, package management, statistical output
 * rendering, and integration with popular R libraries like ggplot2 and tidyverse.
 * 
 * @component RCellRenderer
 * @example
 * <!-- Basic R cell -->
 * <RCellRenderer 
 *   controller={rController}
 *   on:execute={handleExecution}
 * />
 * 
 * <!-- R cell with package installation -->
 * <RCellRenderer 
 *   controller={rController}
 *   availablePackages={['ggplot2', 'dplyr', 'tidyr']}
 *   on:packageInstall={handleRPackageInstall}
 * />
 * 
 * <!-- R cell with plot output -->
 * <RCellRenderer 
 *   controller={rController}
 *   showPlots={true}
 *   plotWidth={600}
 *   plotHeight={400}
 * />
 * 
 * @param {RCellController} controller - R cell controller instance
 * @param {boolean} [editing=false] - Whether cell is in edit mode
 * @param {boolean} [showPlots=true] - Display R plot outputs
 * @param {number} [plotWidth=500] - Default plot width in pixels
 * @param {number} [plotHeight=350] - Default plot height in pixels
 * @param {Array<string>} [availablePackages=[]] - Available R packages for installation
 * @param {boolean} [readOnly=false] - Prevent code editing
 * @param {string} [theme='default'] - Code editor theme
 * 
 * @fires RCellRenderer#execute - Fired when R code execution is triggered
 * @fires RCellRenderer#codeChange - Fired when R code content changes
 * @fires RCellRenderer#packageInstall - Fired when R package installation is requested
 * @fires RCellRenderer#plotGenerated - Fired when R generates a plot output
 * @fires RCellRenderer#dataFrameOutput - Fired when R outputs a data frame
 * @fires RCellRenderer#outputToggle - Fired when output visibility is toggled
 * 
 * @since 1.0.0
 */
export const RCellRenderer = {};