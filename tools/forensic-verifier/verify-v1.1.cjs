#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const verifierPath = path.resolve(__dirname, '../../verification/verifier/verify-v1.1.cjs');
const result = spawnSync('node', [verifierPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
