/**
 * Test regex patterns for article detection
 */

const testTexts = [
  'ARTÍCULO 1.- El Estado garantiza...',
  'Artículo 1.- El Estado garantiza...',
  'ART ÍCULO 1.- El Estado garantiza...',
  'artículo 1.- El Estado garantiza...',
  'ARTICULO 1.- El Estado garantiza...',
];

const patterns = [
  { name: 'Original', regex: /^[Aa]rt[ÍIíi]culo\s+(\d+)/mi },
  { name: 'Case insensitive', regex: /^art[íi]culo\s+(\d+)/mi },
  { name: 'With optional space', regex: /^[Aa]rt\s*[íi]culo\s+(\d+)/mi },
  { name: 'Broad match', regex: /^ART[ÍIíi]CULO\s+(\d+)|^Artículo\s+(\d+)/mi },
  { name: 'Very broad', regex: /^[Aa][Rr][Tt].*?(\d+)/mi },
];

console.log('Testing Article Patterns');
console.log('='.repeat(80));

testTexts.forEach((text, i) => {
  console.log(`\nTest ${i + 1}: "${text}"`);
  patterns.forEach(({ name, regex }) => {
    const match = text.match(regex);
    if (match) {
      console.log(`  ✅ ${name}: matched - number = ${match[1] || match[2]}`);
    } else {
      console.log(`  ❌ ${name}: no match`);
    }
  });
});
