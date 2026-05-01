/**
 * Debug script for constitutional court pattern
 */

const text = 'La Sentencia 001-20/2022 de la Corte Constitucional...';

console.log('Testing constitutional court pattern...');
console.log('Text:', text);
console.log('');

// Test different pattern variations
const patterns = [
  { name: 'Current pattern', regex: /Sentencia\s+(?:No\.\s*)?(\d+[\-\w]*)[\/-](\d{2,4})/gi },
  { name: 'Simplified slash', regex: /Sentencia\s+(\d+[\-\w]*)\/(\ d{2,4})/gi },
  { name: 'Escaped slash', regex: /Sentencia\s+(\d+[\-\w]*)\/(\d{2,4})/gi },
  { name: 'With optional No.', regex: /Sentencia\s+(?:No\.\s*)?(\d+[\-\w]*)\/(\d{2,4})/gi },
  { name: 'Slash or dash', regex: /Sentencia\s+(\d+[\-\w]*)[\/\-](\d{2,4})/gi },
];

patterns.forEach(({name, regex}) => {
  const matches = [...text.matchAll(regex)];
  console.log(`${name}:`);
  console.log(`  Matches: ${matches.length}`);
  if (matches.length > 0) {
    console.log(`  Match[0]: ${matches[0][0]}`);
    console.log(`  Group 1: ${matches[0][1]}`);
    console.log(`  Group 2: ${matches[0][2]}`);
  }
  console.log('');
});
