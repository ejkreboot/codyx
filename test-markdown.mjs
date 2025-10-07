import { marked } from 'marked';

// Test 1: Default behavior
const text1 = "Line 1\nLine 2\nLine 3";
console.log("Test 1 - Default:");
console.log("Input:", JSON.stringify(text1));
console.log("Output:", marked(text1));

// Test 2: With breaks option
marked.setOptions({ breaks: true, gfm: true });
console.log("\nTest 2 - With breaks: true:");
console.log("Input:", JSON.stringify(text1));
console.log("Output:", marked(text1));

// Test 3: Multiple spaces
const text3 = "Word1    Word2    Word3";
console.log("\nTest 3 - Multiple spaces:");
console.log("Input:", JSON.stringify(text3));
console.log("Output:", marked(text3));

// Test 4: Text with double line breaks
const text4 = "Paragraph 1\n\nParagraph 2";
console.log("\nTest 4 - Double line breaks:");
console.log("Input:", JSON.stringify(text4));
console.log("Output:", marked(text4));
