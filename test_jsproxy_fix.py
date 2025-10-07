#!/usr/bin/env python3
"""
Minimal test to verify JsProxy error is fixed.
Run this in a Python cell in Codyx.
"""

# Simple variable assignments that should not cause JsProxy errors
x = 42
name = "test"
numbers = [1, 2, 3]
data = {"key": "value"}

print("Basic variables created:")
print(f"x = {x}")  
print(f"name = {name}")
print(f"numbers = {numbers}")
print(f"data = {data}")

# Test that should previously have caused the JsProxy error
print("\nThis should work without errors now!")