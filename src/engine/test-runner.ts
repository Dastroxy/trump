import { runAllEngineTests } from './engine.test.ts';

console.log('====================================================');
console.log('HEXATRUMP 6-PLAYER CARD GAME ENGINE TEST SUITE');
console.log('====================================================\n');

const suite = runAllEngineTests();

let currentCategory = '';
for (const res of suite.results) {
  if (res.category !== currentCategory) {
    currentCategory = res.category;
    console.log(`\n--- [${currentCategory.toUpperCase()}] ---`);
  }
  const symbol = res.passed ? 'PASS' : 'FAIL';
  console.log(`  [${symbol}] ${res.name}`);
  if (!res.passed) {
    console.log(`         Expected: ${res.expected}`);
    console.log(`         Actual:   ${res.actual}`);
  }
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${suite.passed} / ${suite.total} PASSED (${suite.failed} FAILED)`);
console.log('====================================================');

if (suite.failed > 0) {
  process.exit(1);
} else {
  console.log('All game engine automated tests verified successfully!\n');
  process.exit(0);
}
