#!/usr/bin/env python3
"""
Test script to validate the variable tracking and highlighting system.
This script will test various Python variable scenarios.
"""

# Test 1: Simple variable assignments
print("=== Test 1: Simple Variables ===")
x = 42
name = "Alice"
is_active = True
pi = 3.14159

print(f"x = {x}")
print(f"name = {name}")
print(f"is_active = {is_active}")
print(f"pi = {pi}")

# Test 2: Collections
print("\n=== Test 2: Collections ===")
numbers = [1, 2, 3, 4, 5]
person = {"name": "Bob", "age": 30}
coordinates = (10, 20)

print(f"numbers = {numbers}")
print(f"person = {person}")
print(f"coordinates = {coordinates}")

# Test 3: Functions and classes
print("\n=== Test 3: Functions and Classes ===")
def greet(name):
    return f"Hello, {name}!"

class Calculator:
    def add(self, a, b):
        return a + b

calc = Calculator()
result = calc.add(5, 3)
message = greet(name)

print(f"result = {result}")
print(f"message = {message}")

# Test 4: Complex operations
print("\n=== Test 4: Complex Operations ===")
import math
radius = 5
area = math.pi * radius ** 2
circumference = 2 * math.pi * radius

print(f"radius = {radius}")
print(f"area = {area:.2f}")
print(f"circumference = {circumference:.2f}")

print("\n=== Variable Summary ===")
print("Expected variables to be highlighted:")
expected_vars = [
    'x', 'name', 'is_active', 'pi', 'numbers', 'person', 
    'coordinates', 'calc', 'result', 'message', 'radius', 
    'area', 'circumference'
]
for var in sorted(expected_vars):
    print(f"  - {var}")