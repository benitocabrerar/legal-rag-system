/**
 * Debug document structure parsing
 */

const text = `ARTÍCULO 1.- Primera disposición.

ARTÍCULO 2.- Segunda disposición.

ARTÍCULO 3.- Tercera disposición.`;

console.log('Original Text:');
console.log('='.repeat(80));
console.log(text);
console.log('='.repeat(80));
console.log('');

const lines = text.split('\n');
console.log(`Lines: ${lines.length}`);
lines.forEach((line, i) => {
  console.log(`Line ${i}: "${line}"`);
});

console.log('');

// Test pattern
const articlePattern = /^[Aa]rt[ÍIíi]culo\s+(\d+)/mi;

console.log('Testing pattern against each line:');
lines.forEach((line, i) => {
  const match = line.match(articlePattern);
  console.log(`Line ${i}: ${match ? `✅ MATCH (number=${match[1]})` : '❌ no match'}`);
});
