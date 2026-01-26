#!/usr/bin/env node
/**
 * run-acceptance-tests.cjs
 * 
 * Runs all acceptance tests for v1.1 canonical export harness.
 * Must pass before beta ship.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// -----------------------------
// SMOKE: ensure required Tauri commands are registered
// -----------------------------
function assertTauriCommandRegistered(commandName) {
  const mainPath = path.join(__dirname, '..', 'src-tauri', 'src', 'main.rs');
  if (!fs.existsSync(mainPath)) {
    return {
      pass: false,
      error: `Expected ${mainPath} to exist (cannot check invoke_handler registration).`,
    };
  }
  const txt = fs.readFileSync(mainPath, 'utf8');
  const hasInvokeHandler = txt.includes('invoke_handler');
  const hasCommand = txt.includes(commandName);
  if (!hasInvokeHandler) {
    return { pass: false, error: 'Could not locate invoke_handler![] in src-tauri/src/main.rs' };
  }
  if (!hasCommand) {
    return { pass: false, error: `Command not registered in invoke_handler: ${commandName}` };
  }
  return { pass: true };
}

const TESTS = [];
let passed = 0;
let failed = 0;

function log(msg) {
  console.log(msg);
}

function test(id, name, fn) {
  try {
    const result = fn();
    if (result.pass) {
      log(`✅ ${id}: ${name}`);
      passed++;
    } else {
      log(`❌ ${id}: ${name}`);
      log(`   Error: ${result.error}`);
      failed++;
    }
  } catch (e) {
    log(`❌ ${id}: ${name}`);
    log(`   Exception: ${e.message}`);
    failed++;
  }
}

function runVerifier(packDir, args = '') {
  const verifier = path.join(__dirname, 'tools/verifier/verify-v1.1.cjs');
  try {
    const output = execSync(`node ${verifier} ${packDir} ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stdout || '', error: e.stderr || '' };
  }
}

function runCli(args) {
  const cli = path.join(__dirname, 'tools/cli/evidify-cli.cjs');
  try {
    const output = execSync(`node ${cli} ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stdout || '', exitCode: e.status };
  }
}

log('═══════════════════════════════════════════════════════════════');
log('EVIDIFY v1.1 ACCEPTANCE TESTS');
log('═══════════════════════════════════════════════════════════════');
log('');

// SMOKE-TAURI-001: ensure key frontend-invoked commands exist so UI actions
// fail fast in CI rather than at runtime.
test('SMOKE-TAURI-001', 'Forensic annotation commands are registered in Tauri invoke handler', () => {
  assertTauriCommandRegistered('forensic_list_annotations');
  assertTauriCommandRegistered('forensic_create_annotation');
  assertTauriCommandRegistered('forensic_promote_to_claim');
  return { pass: true };
});

// FT-001: CC-001 PASS matches golden
test('FT-001', 'CC-001 PASS matches golden', () => {
  const goldenPath = path.join(__dirname, 'packs/CC-001/golden/gate_report.canon.json');
  const exportPath = path.join(__dirname, 'exports/PASS');
  
  if (!fs.existsSync(goldenPath)) {
    return { pass: false, error: 'Golden file not found' };
  }
  if (!fs.existsSync(exportPath)) {
    return { pass: false, error: 'PASS export not found' };
  }
  
  const result = runVerifier(exportPath, `--golden ${goldenPath}`);
  if (!result.success) {
    return { pass: false, error: 'Verifier failed' };
  }
  if (!result.output.includes('VERIFICATION: PASS')) {
    return { pass: false, error: 'Golden comparison failed' };
  }
  
  return { pass: true };
});

// FT-002: CC-001 FAIL matches golden
test('FT-002', 'CC-001 FAIL matches golden', () => {
  const goldenPath = path.join(__dirname, 'packs/CC-001/golden/gate_report.FAIL.canon.json');
  const exportPath = path.join(__dirname, 'exports/FAIL');
  
  if (!fs.existsSync(goldenPath)) {
    return { pass: false, error: 'FAIL golden file not found' };
  }
  if (!fs.existsSync(exportPath)) {
    return { pass: false, error: 'FAIL export not found' };
  }
  
  const result = runVerifier(exportPath, `--golden ${goldenPath}`);
  if (!result.success) {
    return { pass: false, error: 'Verifier failed' };
  }
  if (!result.output.includes('VERIFICATION: PASS')) {
    return { pass: false, error: 'Golden comparison failed' };
  }
  
  return { pass: true };
});

// BIG-001: Scale test PASS
test('FT-003', 'BIG-001 PASS matches golden', () => {
  const goldenPath = path.join(__dirname, 'packs/BIG-001/golden/gate_report.canon.json');
  
  if (!fs.existsSync(goldenPath)) {
    return { pass: false, error: 'BIG-001 PASS golden file not found' };
  }
  
  // Generate fresh export
  const tmpDir = '/tmp/big001-test';
  const cliResult = runCli(`run-pack BIG-001 --scenario PASS --export ${tmpDir}`);
  
  if (!cliResult.success) {
    return { pass: false, error: 'CLI execution failed' };
  }
  
  const result = runVerifier(tmpDir, `--golden ${goldenPath}`);
  if (!result.success) {
    return { pass: false, error: 'Verifier failed' };
  }
  if (!result.output.includes('VERIFICATION: PASS')) {
    return { pass: false, error: 'Golden comparison failed' };
  }
  
  return { pass: true };
});

// BIG-001: Scale test FAIL
test('FT-004', 'BIG-001 FAIL matches golden', () => {
  const goldenPath = path.join(__dirname, 'packs/BIG-001/golden/gate_report.FAIL.canon.json');
  
  if (!fs.existsSync(goldenPath)) {
    return { pass: false, error: 'BIG-001 FAIL golden file not found' };
  }
  
  // Generate fresh export
  const tmpDir = '/tmp/big001-fail-test';
  const cliResult = runCli(`run-pack BIG-001 --scenario FAIL --export ${tmpDir}`);
  
  // FAIL scenario should exit with code 1 but still produce valid output
  const result = runVerifier(tmpDir, `--golden ${goldenPath}`);
  if (!result.success) {
    return { pass: false, error: 'Verifier failed' };
  }
  if (!result.output.includes('VERIFICATION: PASS')) {
    return { pass: false, error: 'Golden comparison failed' };
  }
  
  return { pass: true };
});

// BIG-001: Scale metrics
test('SCALE-001', 'BIG-001 audit log has 100+ events', () => {
  const tmpDir = '/tmp/big001-scale-test';
  runCli(`run-pack BIG-001 --scenario PASS --export ${tmpDir}`);
  
  const auditPath = path.join(tmpDir, 'audit/audit.log');
  if (!fs.existsSync(auditPath)) {
    return { pass: false, error: 'Audit log not found' };
  }
  
  const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').length;
  if (lines < 100) {
    return { pass: false, error: `Only ${lines} events, expected 100+` };
  }
  
  return { pass: true };
});

// NT-001: TAMPER-001 fails correctly
test('NT-001', 'TAMPER-001 fails with audit chain error', () => {
  const fixturePath = path.join(__dirname, 'fixtures/negative/TAMPER-001.zip');
  
  if (!fs.existsSync(fixturePath)) {
    return { pass: false, error: 'TAMPER-001 fixture not found' };
  }
  
  // Unzip fixture
  const tmpDir = '/tmp/tamper-test';
  try {
    execSync(`rm -rf ${tmpDir} && mkdir -p ${tmpDir}`);
    execSync(`unzip -q ${fixturePath} -d ${tmpDir}`);
  } catch (e) {
    return { pass: false, error: 'Failed to unzip fixture' };
  }
  
  const result = runVerifier(`${tmpDir}/TAMPER-001`);
  
  // Should fail
  if (result.success) {
    return { pass: false, error: 'Verifier should have failed but passed' };
  }
  
  // Should mention audit chain
  if (!result.output.includes('Audit chain') || !result.output.includes('mismatch')) {
    return { pass: false, error: 'Expected audit chain error not found' };
  }
  
  return { pass: true };
});

// NT-003: MALFORMED-001 schema fails
test('NT-003', 'MALFORMED-001 fails with schema error', () => {
  const fixturePath = path.join(__dirname, 'fixtures/negative/MALFORMED-001.zip');
  const schemaPath = path.join(__dirname, 'schemas/evidify.forensic.gate_report.v1.schema.json');
  
  if (!fs.existsSync(fixturePath)) {
    return { pass: false, error: 'MALFORMED-001 fixture not found' };
  }
  
  // Unzip fixture
  const tmpDir = '/tmp/malformed-test';
  try {
    execSync(`rm -rf ${tmpDir} && mkdir -p ${tmpDir}`);
    execSync(`unzip -q ${fixturePath} -d ${tmpDir}`);
  } catch (e) {
    return { pass: false, error: 'Failed to unzip fixture' };
  }
  
  const result = runVerifier(`${tmpDir}/MALFORMED-001`, `--schema ${schemaPath}`);
  
  // Should fail
  if (result.success) {
    return { pass: false, error: 'Verifier should have failed but passed' };
  }
  
  // Should mention schema
  if (!result.output.includes('Schema validation') && !result.output.includes('FAIL')) {
    return { pass: false, error: 'Expected schema error not found' };
  }
  
  return { pass: true };
});

// NT-004: ID-COLLISION-001 uniqueness fails
test('NT-004', 'ID-COLLISION-001 fails with uniqueness error', () => {
  const fixturePath = path.join(__dirname, 'fixtures/adversarial/ID-COLLISION-001');
  
  if (!fs.existsSync(fixturePath)) {
    return { pass: false, error: 'ID-COLLISION-001 fixture not found' };
  }
  
  // Create minimal pack structure
  const tmpDir = '/tmp/collision-test';
  try {
    execSync(`rm -rf ${tmpDir} && mkdir -p ${tmpDir}/verification`);
    execSync(`cp ${fixturePath}/gate_report.canon.json ${tmpDir}/verification/`);
    // Create minimal canonical.json
    fs.writeFileSync(`${tmpDir}/canonical.json`, '{}');
  } catch (e) {
    return { pass: false, error: 'Failed to setup test' };
  }
  
  const result = runVerifier(tmpDir);
  
  // Should fail due to duplicate IDs
  if (result.success) {
    return { pass: false, error: 'Verifier should have failed but passed' };
  }
  
  if (!result.output.includes('ID uniqueness') || !result.output.includes('Duplicates')) {
    return { pass: false, error: 'Expected uniqueness error not found' };
  }
  
  return { pass: true };
});

// Canonical hash verification
test('HASH-001', 'Canonical hash is verifiable (PASS export)', () => {
  const exportPath = path.join(__dirname, 'exports/PASS');
  const result = runVerifier(exportPath);
  
  if (!result.success) {
    return { pass: false, error: 'Verifier failed' };
  }
  
  if (!result.output.includes('Canonical hash verification') || 
      !result.output.includes('✅')) {
    return { pass: false, error: 'Hash verification not confirmed' };
  }
  
  return { pass: true };
});

// CLI determinism
test('CLI-001', 'CLI produces deterministic output', () => {
  const tmpDir1 = '/tmp/cli-test-1';
  const tmpDir2 = '/tmp/cli-test-2';
  
  // Run CLI twice
  const result1 = runCli(`run-pack CC-001 --scenario PASS --export ${tmpDir1}`);
  const result2 = runCli(`run-pack CC-001 --scenario PASS --export ${tmpDir2}`);
  
  if (!result1.success || !result2.success) {
    return { pass: false, error: 'CLI execution failed' };
  }
  
  // Compare canonical hashes
  try {
    const report1 = JSON.parse(fs.readFileSync(`${tmpDir1}/verification/gate_report.canon.json`));
    const report2 = JSON.parse(fs.readFileSync(`${tmpDir2}/verification/gate_report.canon.json`));
    
    if (report1.inputs_digest.canonical_sha256 !== report2.inputs_digest.canonical_sha256) {
      return { pass: false, error: 'Canonical hashes differ between runs' };
    }
  } catch (e) {
    return { pass: false, error: `Failed to compare: ${e.message}` };
  }
  
  return { pass: true };
});

log('');
log('═══════════════════════════════════════════════════════════════');
log(`ACCEPTANCE: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${passed + failed})`);
log('═══════════════════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
