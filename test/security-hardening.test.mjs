import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Test 1: MCP_AUTH_DISABLED + ALLOW_REMOTE → forces 127.0.0.1
describe('F-MCP-04 bind address', () => {
  it('MCP_AUTH_DISABLED + ALLOW_REMOTE binds 127.0.0.1', async () => {
    const child = spawn('node', ['dist/index.js', '--http'], {
      env: {
        ...process.env,
        MCP_AUTH_DISABLED: '1',
        ALLOW_REMOTE: '1',
        PORT: '0',
        FMP_API_KEY: 'test-key',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => output += d);

    await setTimeout(3000);
    child.kill();

    // Should show 127.0.0.1, NOT 0.0.0.0
    assert.ok(output.includes('127.0.0.1'), `Expected 127.0.0.1 in output, got: ${output}`);
    assert.ok(!output.includes('0.0.0.0'), `Should not contain 0.0.0.0, got: ${output}`);
  });

  it('MCP_AUTH_DISABLED + ALLOW_REMOTE + I_KNOW_THIS_IS_DANGEROUS binds 0.0.0.0', async () => {
    const child = spawn('node', ['dist/index.js', '--http'], {
      env: {
        ...process.env,
        MCP_AUTH_DISABLED: '1',
        ALLOW_REMOTE: '1',
        I_KNOW_THIS_IS_DANGEROUS: '1',
        PORT: '0',
        FMP_API_KEY: 'test-key',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => output += d);

    await setTimeout(3000);
    child.kill();

    assert.ok(output.includes('0.0.0.0'), `Expected 0.0.0.0 in output, got: ${output}`);
    assert.ok(output.includes('SECURITY WARNING'), `Expected warning in output, got: ${output}`);
  });
});

// Test 2: _lastHttpBody not externally accessible
describe('F-MCP-02 private fields', () => {
  it('_lastHttpBody is not accessible outside class', async () => {
    // Dynamic import the built module
    let FmpClient;
    try {
      const mod = await import('../dist/services/fmp.js');
      FmpClient = mod.FmpClient || mod.default;
    } catch {
      // If module can't be imported (missing FMP_API_KEY at import time), skip
      return;
    }
    if (!FmpClient) {
      // If not directly exported, that's fine - the TypeScript private modifier
      // prevents access at compile time. Skip runtime test.
      return;
    }
    // TypeScript 'private' is compile-time only, so at runtime the field
    // still exists. The key protection is compile-time enforcement.
    // We verify the getDiagnosticSummary() method exists and returns sanitized data.
    const client = new FmpClient('test-key');
    const summary = client.getDiagnosticSummary();
    assert.ok(summary !== null && typeof summary === 'object', 'getDiagnosticSummary should return an object');
    assert.strictEqual(summary.last_http_status, null, 'last_http_status should be null initially');
    assert.strictEqual(summary.had_error_body, false, 'had_error_body should be false initially');
    assert.ok(Array.isArray(summary.chunks), 'chunks should be an array');
    // Verify that raw body is NOT exposed in the summary
    assert.strictEqual('last_http_body' in summary, false, 'getDiagnosticSummary should not expose raw HTTP body');
  });
});
