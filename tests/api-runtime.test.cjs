const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('compiled API handlers load in the Node runtime without unresolved imports', () => {
  const root = path.resolve(__dirname, '..');
  const cache = path.join(root, 'node_modules', '.cache');
  fs.mkdirSync(cache, { recursive: true });
  const output = fs.mkdtempSync(path.join(cache, 'finance-runtime-'));
  try {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent({ ...config.config, include: ['api/**/*.ts'] }, ts.sys, root);
    const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: false, rootDir: path.join(root, 'api'), outDir: output });
    assert.equal(ts.getPreEmitDiagnostics(program).length, 0);
    assert.equal(program.emit().emitSkipped, false);
    for (const route of ['plans', 'authorize', 'auth/config', 'me/subscription', 'billing/checkout', 'billing/webhook', 'billing/cancel']) {
      assert.equal(typeof require(path.join(output, route + '.js')).default, 'function', route);
    }
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
