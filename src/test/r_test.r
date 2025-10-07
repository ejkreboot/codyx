# Comprehensive R Test Suite for Codyx
# Testing various R functionality, data structures, and operations

cat("🧪 Starting Codyx R Test Suite\n")
cat(paste(rep("=", 40), collapse = ""), "\n\n")

# Test 1: Basic R Operations and Data Types
cat("📋 Test 1: Basic R Operations\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Numeric operations
a <- 10
b <- 3.14159
result <- a * b
cat(sprintf("Numeric calculation: %d × %.5f = %.3f\n", a, b, result))

# String operations
text1 <- "Hello"
text2 <- "Codyx"
combined <- paste(text1, text2, sep = " ")
cat(sprintf("String operation: '%s' + '%s' = '%s'\n", text1, text2, combined))

# Logical operations
logical_test <- (a > 5) && (b < 4)
cat(sprintf("Logical test: (%d > 5) AND (%.2f < 4) = %s\n", a, b, logical_test))

# Test 2: Vector Operations
cat("\n📊 Test 2: Vector Operations\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Create vectors
numbers <- c(1, 2, 3, 4, 5, 10, 15, 20)
names_vec <- c("Alice", "Bob", "Charlie", "Diana")

cat(sprintf("Numbers vector: [%s]\n", paste(numbers, collapse = ", ")))
cat(sprintf("Names vector: [%s]\n", paste(names_vec, collapse = ", ")))

# Vector statistics
cat(sprintf("Mean: %.2f, Median: %.1f, Sum: %d\n", 
    mean(numbers), median(numbers), sum(numbers)))
cat(sprintf("Min: %d, Max: %d, Length: %d\n", 
    min(numbers), max(numbers), length(numbers)))

# Vector filtering
filtered <- numbers[numbers > 5]
cat(sprintf("Numbers > 5: [%s]\n", paste(filtered, collapse = ", ")))

# Test 3: Data Frame Operations
cat("\n📈 Test 3: Data Frame Operations\n")
cat(paste(rep("-", 30), collapse = ""), "\n")

# Create a test data frame
df <- data.frame(
  name = c("Alice", "Bob", "Charlie", "Diana", "Eve"),
  age = c(25, 30, 35, 28, 32),
  score = c(85.5, 92.0, 78.5, 96.0, 89.5),
  department = c("Engineering", "Marketing", "Engineering", "Sales", "Marketing"),
  stringsAsFactors = FALSE
)

cat("Created data frame:\n")
print(df)

# Data frame analysis
cat(sprintf("\nData frame dimensions: %d rows × %d columns\n", nrow(df), ncol(df)))
cat(sprintf("Average age: %.1f years\n", mean(df$age)))
cat(sprintf("Average score: %.1f points\n", mean(df$score)))

# Filtering data frame
high_scorers <- df[df$score > 85, ]
cat(sprintf("\nHigh scorers (>85): %d people\n", nrow(high_scorers)))
print(high_scorers[, c("name", "score")])

# Test 4: Statistical Functions
cat("\n📊 Test 4: Statistical Analysis\n")
cat(paste(rep("-", 30), collapse = ""), "\n")

# Generate sample data
set.seed(123)
sample_data <- rnorm(100, mean = 50, sd = 10)

# Basic statistics
stats <- data.frame(
  Statistic = c("Mean", "Median", "Std Dev", "Variance", "Min", "Max"),
  Value = c(mean(sample_data), median(sample_data), sd(sample_data), 
           var(sample_data), min(sample_data), max(sample_data))
)

cat("Statistical summary of random normal data (n=100):\n")
print(stats)

# Quartiles
quartiles <- quantile(sample_data, c(0, 0.25, 0.5, 0.75, 1))
cat("\nQuartiles:\n")
print(quartiles)

# Test 5: Control Structures
cat("\n🔄 Test 5: Control Structures\n")
cat(paste(rep("-", 30), collapse = ""), "\n")

# For loop
cat("For loop - counting squares:\n")
squares <- c()
for(i in 1:5) {
  square <- i^2
  squares <- c(squares, square)
  cat(sprintf("%d² = %d\n", i, square))
}

# While loop
cat("\nWhile loop - Fibonacci sequence:\n")
fib <- c(1, 1)
while(length(fib) < 8) {
  next_fib <- sum(tail(fib, 2))
  fib <- c(fib, next_fib)
}
cat(sprintf("First 8 Fibonacci numbers: [%s]\n", paste(fib, collapse = ", ")))

# Conditional statements
cat("\nConditional testing:\n")
test_values <- c(-5, 0, 3, 10, 15)
for(val in test_values) {
  if(val < 0) {
    category <- "Negative"
  } else if(val == 0) {
    category <- "Zero"
  } else if(val <= 10) {
    category <- "Small positive"
  } else {
    category <- "Large positive"
  }
  cat(sprintf("Value %d is: %s\n", val, category))
}

# Test 6: Functions and Apply Family
cat("\n⚙️  Test 6: Custom Functions\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Custom function
calculate_stats <- function(x) {
  list(
    mean = mean(x),
    median = median(x),
    sd = sd(x),
    length = length(x)
  )
}

# Test the function
test_data <- c(10, 20, 30, 25, 15, 35, 40, 22, 18, 28)
results <- calculate_stats(test_data)
cat("Custom function results:\n")
cat(sprintf("Data: [%s]\n", paste(test_data, collapse = ", ")))
cat(sprintf("Mean: %.2f, Median: %.1f\n", results$mean, results$median))
cat(sprintf("Std Dev: %.2f, Length: %d\n", results$sd, results$length))

# Apply functions
cat("\nUsing apply functions:\n")
matrix_data <- matrix(1:12, nrow = 3, ncol = 4)
cat("Test matrix:\n")
print(matrix_data)

row_sums <- apply(matrix_data, 1, sum)
col_means <- apply(matrix_data, 2, mean)
cat(sprintf("Row sums: [%s]\n", paste(row_sums, collapse = ", "))
cat(sprintf("Column means: [%s]\n", paste(round(col_means, 2), collapse = ", "))

# Test 7: List Operations
cat("\n📋 Test 7: List Operations\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Create a complex list
my_list <- list(
  numbers = 1:5,
  text = c("apple", "banana", "cherry"),
  matrix = matrix(1:6, nrow = 2),
  nested = list(a = 10, b = 20)
)

cat("Created complex list structure:\n")
cat("- Numbers:", paste(my_list$numbers, collapse = ", "), "\n")
cat("- Text:", paste(my_list$text, collapse = ", "), "\n")
cat("- Matrix dimensions:", dim(my_list$matrix)[1], "×", dim(my_list$matrix)[2], "\n")
cat("- Nested list sum:", my_list$nested$a + my_list$nested$b, "\n")

# Test 8: String Manipulation
cat("\n📝 Test 8: String Operations\n")
cat(paste(rep("-", 30), collapse = ""), "\n")

text <- "The Quick Brown Fox Jumps Over The Lazy Dog"
cat(sprintf("Original: '%s'\n", text))
cat(sprintf("Lowercase: '%s'\n", tolower(text)))
cat(sprintf("Uppercase: '%s'\n", toupper(text)))
cat(sprintf("Character count: %d\n", nchar(text)))

# String splitting and manipulation
words <- strsplit(text, " ")[[1]]
cat(sprintf("Word count: %d\n", length(words)))
cat(sprintf("Words starting with vowels: %s\n", 
    paste(words[grepl("^[AEIOUaeiou]", words)], collapse = ", ")))

# Test 9: Date and Time
cat("\n📅 Test 9: Date and Time Operations\n")
cat(paste(rep("-", 35), collapse = ""), "\n")

current_time <- Sys.time()
current_date <- Sys.Date()
cat(sprintf("Current time: %s\n", current_time))
cat(sprintf("Current date: %s\n", current_date))

# Date arithmetic
future_date <- current_date + 30
past_date <- current_date - 7
cat(sprintf("30 days from now: %s\n", future_date))
cat(sprintf("7 days ago: %s\n", past_date))

# Test 10: Base R Plotting
cat("\n📊 Test 10: Base R Plotting\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Generate sample data for plotting
set.seed(456)
x <- 1:20
y <- x + rnorm(20, 0, 3)
categories <- factor(rep(c("Group A", "Group B"), each = 10))

cat("Creating base R plots...\n")

# Basic scatter plot
plot(x, y, 
     main = "Base R Scatter Plot", 
     xlab = "X Values", 
     ylab = "Y Values",
     pch = 19, 
     col = "blue",
     cex = 1.2)
abline(lm(y ~ x), col = "red", lwd = 2)

cat("✓ Scatter plot with trend line created\n")

# Histogram
hist(y, 
     main = "Distribution of Y Values", 
     xlab = "Y Values", 
     col = "lightblue", 
     border = "black",
     breaks = 8)

cat("✓ Histogram created\n")

# Box plot by categories
boxplot(y ~ categories, 
        main = "Y Values by Category",
        xlab = "Category", 
        ylab = "Y Values",
        col = c("lightgreen", "lightcoral"))

cat("✓ Box plot created\n")

# Test 11: ggplot2 Advanced Plotting
cat("\n🎨 Test 11: ggplot2 Advanced Plotting\n")
cat(paste(rep("-", 35), collapse = ""), "\n")

# Load ggplot2 for advanced plotting
library(ggplot2)

cat("ggplot2 loaded successfully!\n")

# Create a more complex dataset
plot_data <- data.frame(
  x = rep(1:10, 3),
  y = c(1:10 + rnorm(10, 0, 1),
        (1:10)^1.5 + rnorm(10, 0, 2),
        log(1:10) * 5 + rnorm(10, 0, 0.5)),
  group = factor(rep(c("Linear", "Power", "Logarithmic"), each = 10)),
  size = runif(30, 0.5, 3)
)

cat("Created complex dataset for ggplot2 testing\n")

# Multi-panel ggplot with different geoms
p1 <- ggplot(plot_data, aes(x = x, y = y, color = group)) +
  geom_point(aes(size = size), alpha = 0.7) +
  geom_smooth(method = "loess", se = TRUE, alpha = 0.3) +
  facet_wrap(~ group, scales = "free_y") +
  labs(
    title = "Multi-Panel Analysis by Function Type",
    subtitle = "Points sized by random variable, with smoothed trends",
    x = "X Values",
    y = "Y Values",
    color = "Function Type",
    size = "Random Size"
  ) +
  theme_minimal() +
  theme(
    plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5, size = 11),
    legend.position = "bottom"
  ) +
  scale_color_brewer(type = "qual", palette = "Set1")

print(p1)

cat("✓ Multi-panel ggplot with facets created\n")

# Density and violin plots
p2 <- ggplot(plot_data, aes(x = group, y = y, fill = group)) +
  geom_violin(alpha = 0.7, trim = FALSE) +
  geom_boxplot(width = 0.2, fill = "white", alpha = 0.8) +
  geom_jitter(width = 0.15, alpha = 0.5, size = 1) +
  labs(
    title = "Distribution Comparison Across Groups",
    x = "Function Type",
    y = "Y Values",
    fill = "Group"
  ) +
  theme_classic() +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    legend.position = "none"
  ) +
  scale_fill_viridis_d(option = "plasma", alpha = 0.8)

print(p2)

cat("✓ Violin plot with overlaid boxplot created\n")

# Test 12: Statistical Plotting
cat("\n📈 Test 12: Statistical Visualization\n")
cat(paste(rep("-", 35), collapse = ""), "\n")

# Generate data for statistical plots
n <- 100
stat_data <- data.frame(
  normal = rnorm(n, 50, 10),
  uniform = runif(n, 20, 80),
  exponential = rexp(n, 0.1),
  chi_square = rchisq(n, df = 5) * 10
)

cat("Generated statistical distributions for plotting\n")

# Correlation matrix visualization using base R
pairs(stat_data, 
      main = "Correlation Matrix of Different Distributions",
      pch = 19,
      col = rgb(0, 0, 1, 0.5))

cat("✓ Correlation matrix plot created\n")

# QQ plots for normality checking
par(mfrow = c(2, 2))
for(i in 1:4) {
  col_name <- names(stat_data)[i]
  qqnorm(stat_data[, i], 
         main = paste("Q-Q Plot:", col_name),
         pch = 19,
         col = rainbow(4)[i])
  qqline(stat_data[, i], col = "red", lwd = 2)
}
par(mfrow = c(1, 1))

cat("✓ Q-Q plots for all distributions created\n")

# Test 13: Error Handling
cat("\n⚠️  Test 13: Error Handling\n")
cat(paste(rep("-", 25), collapse = ""), "\n")

# Demonstrate error handling
safe_divide <- function(x, y) {
  tryCatch({
    if(y == 0) {
      stop("Cannot divide by zero!")
    }
    result <- x / y
    cat(sprintf("%.2f ÷ %.2f = %.3f\n", x, y, result))
    return(result)
  }, error = function(e) {
    cat(sprintf("Error: %s\n", e$message))
    return(NA)
  })
}

# Test error handling
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(15, 3)

# Test plotting with error handling
safe_plot <- function(data, title) {
  tryCatch({
    if(length(data) < 2) {
      stop("Insufficient data for plotting")
    }
    plot(data, main = title, type = "l", col = "blue", lwd = 2)
    cat(sprintf("✓ Plot '%s' created successfully\n", title))
  }, error = function(e) {
    cat(sprintf("✗ Plot error: %s\n", e$message))
  })
}

# Test safe plotting
safe_plot(1:10, "Valid Data Plot")
safe_plot(c(), "Empty Data Plot")
safe_plot(c(5), "Single Point Plot")

# Final Summary
cat("\n✅ Test Suite Complete!\n")
cat(paste(rep("=", 40), collapse = ""), "\n")
cat("All R functionality tests completed successfully.\n")
cat("✓ Basic operations and data types\n")
cat("✓ Vector and matrix operations\n") 
cat("✓ Data frame manipulation\n")
cat("✓ Statistical functions\n")
cat("✓ Control structures (loops, conditionals)\n")
cat("✓ Custom functions and apply family\n")
cat("✓ List operations and data structures\n")
cat("✓ String manipulation and pattern matching\n")
cat("✓ Date and time operations\n")
cat("✓ Base R plotting (scatter, histogram, boxplot)\n")
cat("✓ ggplot2 advanced visualization\n")
cat("✓ Statistical plotting (correlation matrix, Q-Q plots)\n")
cat("✓ Error handling and exception management\n")
cat("\n� Graphics capabilities tested:\n")
cat("  • Base R plots with customization\n")
cat("  • ggplot2 multi-panel faceted plots\n")
cat("  • Statistical distribution visualizations\n")
cat("  • Error handling for plotting functions\n")
cat("\n�🎉 Codyx R environment is fully functional with graphics!\n")