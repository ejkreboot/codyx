# WebR Package Download Analysis
# This script helps diagnose what packages are being downloaded

cat("🔍 WebR Package Download Analysis\n")
cat(paste(rep("=", 40), collapse = ""), "\n\n")

# Check what's currently installed BEFORE loading ggplot2
cat("📦 Currently installed packages (before ggplot2):\n")
installed_before <- installed.packages()[, "Package"]
cat(sprintf("Count: %d packages\n", length(installed_before)))
cat("Base packages:", paste(head(sort(installed_before), 10), collapse = ", "), "...\n\n")

cat("🎯 Loading ggplot2 (this will show download activity)...\n")
cat("Watch the browser console for download messages!\n\n")

# Time the installation
start_time <- Sys.time()

# Load ggplot2 - this will trigger downloads
library(ggplot2)

end_time <- Sys.time()
load_time <- as.numeric(difftime(end_time, start_time, units = "secs"))

cat(sprintf("⏱️  ggplot2 loading completed in %.2f seconds\n\n", load_time))

# Check what's installed AFTER loading ggplot2
cat("📦 Currently installed packages (after ggplot2):\n")
installed_after <- installed.packages()[, "Package"]
cat(sprintf("Count: %d packages\n", length(installed_after)))

# Find what was newly installed
newly_installed <- setdiff(installed_after, installed_before)
cat(sprintf("\n🆕 Newly installed packages: %d\n", length(newly_installed)))

if(length(newly_installed) > 0) {
  cat("Dependencies downloaded for ggplot2:\n")
  # Group into categories for better understanding
  core_packages <- c("ggplot2", "scales", "grid", "gtable")
  data_packages <- c("tibble", "dplyr", "tidyselect", "vctrs")
  utility_packages <- c("rlang", "lifecycle", "glue", "withr", "cli")
  
  categorized <- list()
  categorized$core <- intersect(newly_installed, core_packages)
  categorized$data <- intersect(newly_installed, data_packages) 
  categorized$utility <- intersect(newly_installed, utility_packages)
  categorized$other <- setdiff(newly_installed, c(core_packages, data_packages, utility_packages))
  
  for(category in names(categorized)) {
    if(length(categorized[[category]]) > 0) {
      cat(sprintf("  %s (%d): %s\n", 
          toupper(category), 
          length(categorized[[category]]), 
          paste(categorized[[category]], collapse = ", ")))
    }
  }
} else {
  cat("No new packages were downloaded (already cached)\n")
}

# Test ggplot2 functionality
cat("\n🎨 Testing ggplot2 functionality:\n")
test_data <- data.frame(
  x = 1:10,
  y = (1:10)^2 + rnorm(10, 0, 5)
)

p <- ggplot(test_data, aes(x = x, y = y)) + 
  geom_point(color = "blue", size = 3) + 
  geom_smooth(method = "lm", se = FALSE, color = "red") +
  labs(title = "WebR ggplot2 Test Plot", 
       x = "X Values", 
       y = "Y Values") +
  theme_minimal()

print(p)

cat("\n✅ ggplot2 test completed successfully!\n")

# Memory usage check
cat("\n💾 Memory usage analysis:\n")
mem_info <- gc()
cat("Current R memory usage:\n")
print(mem_info)

cat("\n📊 Package download summary:\n")
cat(sprintf("• Total packages now: %d\n", length(installed_after)))
cat(sprintf("• Newly downloaded: %d\n", length(newly_installed)))
cat(sprintf("• Load time: %.2f seconds\n", load_time))

if(length(newly_installed) > 15) {
  cat("\n⚠️  WARNING: Large number of dependencies downloaded!\n")
  cat("This is normal for ggplot2's first load but indicates why it takes time.\n")
  cat("Subsequent uses should be much faster (cached).\n")
} else if(length(newly_installed) == 0) {
  cat("\n✅ GOOD: No downloads needed (packages already cached)\n")
} else {
  cat(sprintf("\n✅ NORMAL: %d dependencies is typical for ggplot2\n", length(newly_installed)))
}

cat("\n🔧 Optimization recommendations:\n")
cat("1. First ggplot2 load downloads ~15-25 dependencies (normal)\n")
cat("2. Subsequent loads should be instant (cached)\n") 
cat("3. Consider pre-loading ggplot2 in startup if used frequently\n")
cat("4. WebR downloads are cached in browser storage\n")
cat("5. Clear browser cache to reset package cache if needed\n")

cat("\n🎉 Package analysis complete!\n")