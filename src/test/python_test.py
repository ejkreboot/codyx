# Comprehensive Python Test Suite for Codyx
# Testing various Python functionality, data structures, and operations

print("🧪 Starting Codyx Python Test Suite")
print("=" * 40)
print()

# Test 1: Basic Python Operations and Data Types
print("📋 Test 1: Basic Python Operations")
print("-" * 25)

# Numeric operations
a = 10
b = 3.14159
result = a * b
print(f"Numeric calculation: {a} × {b:.5f} = {result:.3f}")

# String operations
text1 = "Hello"
text2 = "Codyx"
combined = f"{text1} {text2}"
print(f"String operation: '{text1}' + '{text2}' = '{combined}'")

# Boolean operations
logical_test = (a > 5) and (b < 4)
print(f"Logical test: ({a} > 5) AND ({b:.2f} < 4) = {logical_test}")

# Test 2: List and Tuple Operations
print("\n📊 Test 2: List and Tuple Operations")
print("-" * 25)

# Create lists and tuples
numbers = [1, 2, 3, 4, 5, 10, 15, 20]
names = ["Alice", "Bob", "Charlie", "Diana"]
coordinates = (10.5, 20.3)

print(f"Numbers list: {numbers}")
print(f"Names list: {names}")
print(f"Coordinates tuple: {coordinates}")

# List statistics using built-in functions
import statistics
print(f"Mean: {statistics.mean(numbers):.2f}, Median: {statistics.median(numbers):.1f}, Sum: {sum(numbers)}")
print(f"Min: {min(numbers)}, Max: {max(numbers)}, Length: {len(numbers)}")

# List comprehension and filtering
filtered = [x for x in numbers if x > 5]
squares = [x**2 for x in range(1, 6)]
print(f"Numbers > 5: {filtered}")
print(f"Squares 1-5: {squares}")

# Test 3: Dictionary Operations
print("\n📈 Test 3: Dictionary Operations")
print("-" * 30)

# Create a test dictionary
people = {
    "Alice": {"age": 25, "score": 85.5, "department": "Engineering"},
    "Bob": {"age": 30, "score": 92.0, "department": "Marketing"},
    "Charlie": {"age": 35, "score": 78.5, "department": "Engineering"},
    "Diana": {"age": 28, "score": 96.0, "department": "Sales"},
    "Eve": {"age": 32, "score": 89.5, "department": "Marketing"}
}

print("Created people dictionary:")
for name, info in people.items():
    print(f"  {name}: Age {info['age']}, Score {info['score']}, {info['department']}")

# Dictionary analysis
ages = [info["age"] for info in people.values()]
scores = [info["score"] for info in people.values()]
print(f"\nDictionary analysis:")
print(f"Average age: {sum(ages)/len(ages):.1f} years")
print(f"Average score: {sum(scores)/len(scores):.1f} points")

# Filtering dictionary
high_scorers = {name: info for name, info in people.items() if info["score"] > 85}
print(f"\nHigh scorers (>85): {len(high_scorers)} people")
for name, info in high_scorers.items():
    print(f"  {name}: {info['score']}")

# Test 4: NumPy Array Operations
print("\n📊 Test 4: NumPy Array Operations")
print("-" * 30)

import numpy as np

# Create numpy arrays
arr = np.array([1, 2, 3, 4, 5, 10, 15, 20])
matrix = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
random_data = np.random.normal(50, 10, 100)

print(f"Array: {arr}")
print(f"Matrix shape: {matrix.shape}")
print(f"Matrix:\n{matrix}")

# Array statistics
print(f"\nArray statistics:")
print(f"Mean: {np.mean(arr):.2f}, Std: {np.std(arr):.2f}")
print(f"Random data mean: {np.mean(random_data):.2f}, std: {np.std(random_data):.2f}")

# Array operations
arr_squared = arr ** 2
matrix_sum = np.sum(matrix, axis=1)  # Sum along rows
print(f"Array squared: {arr_squared}")
print(f"Matrix row sums: {matrix_sum}")

# Test 5: Control Structures
print("\n🔄 Test 5: Control Structures")
print("-" * 30)

# For loop
print("For loop - counting squares:")
squares = []
for i in range(1, 6):
    square = i**2
    squares.append(square)
    print(f"{i}² = {square}")

# While loop
print("\nWhile loop - Fibonacci sequence:")
fib = [1, 1]
while len(fib) < 8:
    next_fib = fib[-1] + fib[-2]
    fib.append(next_fib)
print(f"First 8 Fibonacci numbers: {fib}")

# Conditional statements
print("\nConditional testing:")
test_values = [-5, 0, 3, 10, 15]
for val in test_values:
    if val < 0:
        category = "Negative"
    elif val == 0:
        category = "Zero"
    elif val <= 10:
        category = "Small positive"
    else:
        category = "Large positive"
    print(f"Value {val} is: {category}")

# Test 6: Functions and Lambda
print("\n⚙️  Test 6: Functions and Lambda")
print("-" * 25)

# Custom function
def calculate_stats(data):
    """Calculate basic statistics for a list of numbers."""
    return {
        "mean": sum(data) / len(data),
        "median": sorted(data)[len(data)//2],
        "std": np.std(data),
        "length": len(data)
    }

# Test the function
test_data = [10, 20, 30, 25, 15, 35, 40, 22, 18, 28]
results = calculate_stats(test_data)
print("Custom function results:")
print(f"Data: {test_data}")
print(f"Mean: {results['mean']:.2f}, Median: {results['median']:.1f}")
print(f"Std Dev: {results['std']:.2f}, Length: {results['length']}")

# Lambda functions and map/filter
print("\nUsing lambda functions:")
doubled = list(map(lambda x: x * 2, range(1, 6)))
evens = list(filter(lambda x: x % 2 == 0, range(1, 11)))
print(f"Doubled 1-5: {doubled}")
print(f"Even numbers 1-10: {evens}")

# Test 7: Class and Object Operations
print("\n📋 Test 7: Classes and Objects")
print("-" * 25)

class DataAnalyzer:
    def __init__(self, name):
        self.name = name
        self.data = []
    
    def add_data(self, *values):
        self.data.extend(values)
    
    def get_summary(self):
        if not self.data:
            return "No data available"
        return {
            "count": len(self.data),
            "mean": sum(self.data) / len(self.data),
            "min": min(self.data),
            "max": max(self.data)
        }
    
    def __str__(self):
        return f"DataAnalyzer('{self.name}') with {len(self.data)} data points"

# Create and use class instance
analyzer = DataAnalyzer("Test Analysis")
analyzer.add_data(1, 2, 3, 4, 5, 10, 15, 20)
summary = analyzer.get_summary()

print(f"Created analyzer: {analyzer}")
print("Analysis summary:")
for key, value in summary.items():
    if isinstance(value, float):
        print(f"  {key}: {value:.2f}")
    else:
        print(f"  {key}: {value}")

# Test 8: String Manipulation
print("\n📝 Test 8: String Operations")
print("-" * 30)

text = "The Quick Brown Fox Jumps Over The Lazy Dog"
print(f"Original: '{text}'")
print(f"Lowercase: '{text.lower()}'")
print(f"Uppercase: '{text.upper()}'")
print(f"Character count: {len(text)}")

# String splitting and manipulation
words = text.split()
print(f"Word count: {len(words)}")
vowel_words = [word for word in words if word[0].lower() in 'aeiou']
print(f"Words starting with vowels: {vowel_words}")

# Regular expressions
import re
print(f"Words with 'o': {len(re.findall(r'\\b\\w*o\\w*\\b', text, re.IGNORECASE))}")

# Test 9: Date and Time
print("\n📅 Test 9: Date and Time Operations")
print("-" * 35)

from datetime import datetime, timedelta
import time

current_time = datetime.now()
current_timestamp = time.time()
print(f"Current datetime: {current_time}")
print(f"Current timestamp: {current_timestamp}")

# Date arithmetic
future_date = current_time + timedelta(days=30)
past_date = current_time - timedelta(days=7)
print(f"30 days from now: {future_date.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"7 days ago: {past_date.strftime('%Y-%m-%d %H:%M:%S')}")

# Test 10: Matplotlib Plotting
print("\n📊 Test 10: Matplotlib Plotting")
print("-" * 30)

import matplotlib.pyplot as plt

# Generate sample data for plotting
x = np.linspace(0, 10, 50)
y1 = np.sin(x) + 0.1 * np.random.randn(50)
y2 = np.cos(x) + 0.1 * np.random.randn(50)

print("Creating matplotlib plots...")

# Basic line plot
plt.figure(figsize=(10, 6))
plt.subplot(2, 2, 1)
plt.plot(x, y1, 'b-', label='Sin wave', linewidth=2)
plt.plot(x, y2, 'r--', label='Cos wave', linewidth=2)
plt.title('Trigonometric Functions')
plt.xlabel('X values')
plt.ylabel('Y values')
plt.legend()
plt.grid(True, alpha=0.3)

# Histogram
plt.subplot(2, 2, 2)
data_hist = np.random.normal(50, 15, 1000)
plt.hist(data_hist, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
plt.title('Normal Distribution')
plt.xlabel('Values')
plt.ylabel('Frequency')

# Scatter plot
plt.subplot(2, 2, 3)
scatter_x = np.random.randn(100)
scatter_y = scatter_x + np.random.randn(100) * 0.5
colors = np.random.rand(100)
plt.scatter(scatter_x, scatter_y, c=colors, alpha=0.6, cmap='viridis')
plt.title('Scatter Plot with Colors')
plt.xlabel('X values')
plt.ylabel('Y values')
plt.colorbar()

# Bar plot
plt.subplot(2, 2, 4)
categories = ['A', 'B', 'C', 'D', 'E']
values = [23, 45, 56, 78, 32]
plt.bar(categories, values, color=['red', 'green', 'blue', 'orange', 'purple'])
plt.title('Bar Chart')
plt.xlabel('Categories')
plt.ylabel('Values')

plt.tight_layout()
plt.show()

print("✓ Four matplotlib subplots created successfully")

# Test 11: Pandas DataFrame Operations
print("\n📊 Test 11: Pandas DataFrame Operations")
print("-" * 35)

import pandas as pd

# Create a sample DataFrame
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
    'age': [25, 30, 35, 28, 32, 27],
    'score': [85.5, 92.0, 78.5, 96.0, 89.5, 83.0],
    'department': ['Engineering', 'Marketing', 'Engineering', 'Sales', 'Marketing', 'Sales'],
    'salary': [70000, 65000, 75000, 68000, 72000, 66000]
})

print("Created DataFrame:")
print(df)

# DataFrame analysis
print(f"\nDataFrame info:")
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"Data types:\n{df.dtypes}")

# Basic statistics
print(f"\nNumerical statistics:")
print(df.describe())

# Filtering and grouping
high_scorers = df[df['score'] > 85]
dept_summary = df.groupby('department').agg({
    'age': 'mean',
    'score': 'mean',
    'salary': 'mean'
}).round(2)

print(f"\nHigh scorers (>85):")
print(high_scorers[['name', 'score']])

print(f"\nDepartment summary:")
print(dept_summary)

# Test 12: Error Handling and Context Managers
print("\n⚠️  Test 12: Error Handling")
print("-" * 25)

# Demonstrate error handling
def safe_divide(x, y):
    try:
        if y == 0:
            raise ValueError("Cannot divide by zero!")
        result = x / y
        print(f"{x:.2f} ÷ {y:.2f} = {result:.3f}")
        return result
    except ValueError as e:
        print(f"Error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# Test error handling
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(15, 3)

# Context manager example
print("\nContext manager example:")
try:
    with open('/tmp/test_file.txt', 'w') as f:
        f.write("Test content for Codyx")
    
    with open('/tmp/test_file.txt', 'r') as f:
        content = f.read()
        print(f"File content: '{content}'")
except Exception as e:
    print(f"File operation error: {e}")

# Test 13: List/Dict Comprehensions and Generators
print("\n🔄 Test 13: Advanced Python Features")
print("-" * 35)

# List comprehensions
numbers = range(1, 11)
squares = [x**2 for x in numbers]
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(f"Squares: {squares}")
print(f"Even squares: {even_squares}")

# Dictionary comprehension
square_dict = {x: x**2 for x in range(1, 6)}
print(f"Square dictionary: {square_dict}")

# Generator function
def fibonacci_generator(n):
    a, b = 0, 1
    count = 0
    while count < n:
        yield a
        a, b = b, a + b
        count += 1

fib_gen = list(fibonacci_generator(10))
print(f"Fibonacci generator (10): {fib_gen}")

# Set operations
set1 = {1, 2, 3, 4, 5}
set2 = {4, 5, 6, 7, 8}
print(f"Set 1: {set1}")
print(f"Set 2: {set2}")
print(f"Union: {set1 | set2}")
print(f"Intersection: {set1 & set2}")
print(f"Difference: {set1 - set2}")

# Final Summary
print("\n✅ Test Suite Complete!")
print("=" * 40)
print("All Python functionality tests completed successfully.")
print("✓ Basic operations and data types")
print("✓ Lists, tuples, and dictionaries")
print("✓ NumPy arrays and operations")
print("✓ Control structures (loops, conditionals)")
print("✓ Functions and lambda expressions")
print("✓ Classes and object-oriented programming")
print("✓ String manipulation and regular expressions")
print("✓ Date and time operations")
print("✓ Matplotlib plotting (4 subplot types)")
print("✓ Pandas DataFrame analysis")
print("✓ Error handling and context managers")
print("✓ Advanced features (comprehensions, generators, sets)")

print("\n🎨 Graphics capabilities tested:")
print("  • Line plots with multiple series")
print("  • Histograms with custom styling")
print("  • Scatter plots with color mapping")
print("  • Bar charts with category colors")

print("\n🎉 Codyx Python environment is fully functional!")