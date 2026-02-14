#!/usr/bin/env node
const { spawn } = require('node:child_process');
let script;
try {
  script = require.resolve('@qrfinder/public/bin/qrfinder-public.js');
} catch (error) {
  console.error('Unable to resolve @qrfinder/public CLI binary.');
  console.error(error.message);
  process.exit(1);
}
const child = spawn(process.execPath, [script], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
