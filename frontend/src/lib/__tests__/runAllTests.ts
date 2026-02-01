#!/usr/bin/env npx tsx
/**
 * Wolfe Error Taxonomy Test Runner
 *
 * Runs all tests for the Wolfe Error Taxonomy implementation.
 * Run with: npx tsx frontend/src/lib/__tests__/runAllTests.ts
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     WOLFE ERROR TAXONOMY - COMPREHENSIVE TEST SUITE         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const tests = [
  { name: 'Wolfe Classifier Tests', file: 'wolfeClassifier.test.ts' },
  { name: 'Wolfe Analytics Tests', file: 'wolfeAnalytics.test.ts' },
];

let allPassed = true;

for (const test of tests) {
  console.log(`\n📂 Running: ${test.name}`);
  console.log('─'.repeat(60));

  try {
    const testPath = resolve(__dirname, test.file);
    execSync(`npx tsx "${testPath}"`, { stdio: 'inherit' });
    console.log(`\n✅ ${test.name} completed successfully\n`);
  } catch (error) {
    console.log(`\n❌ ${test.name} failed\n`);
    allPassed = false;
  }
}

console.log('\n' + '═'.repeat(60));
if (allPassed) {
  console.log('\n🎉 ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED\n');
  process.exit(1);
}
