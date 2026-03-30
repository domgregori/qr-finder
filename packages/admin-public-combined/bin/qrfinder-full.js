#!/usr/bin/env node
const { spawn } = require('node:child_process');
let adminScript;
let publicScript;
try {
  adminScript = require.resolve('@qrfinder/admin/bin/qrfinder-admin.js');
  publicScript = require.resolve('@qrfinder/public/bin/qrfinder-public.js');
} catch (error) {
  console.error('Unable to resolve @qrfinder admin/public CLI binaries.');
  console.error(error.message);
  process.exit(1);
}

const adminPort = process.env.ADMIN_PORT || '3000';
const publicPort = process.env.PUBLIC_PORT || '3001';

const children = [
  spawn(process.execPath, [adminScript], {
    stdio: 'inherit',
    env: { ...process.env, PORT: adminPort },
  }),
  spawn(process.execPath, [publicScript], {
    stdio: 'inherit',
    env: { ...process.env, PORT: publicPort },
  }),
];

function shutdown(signal = 'SIGTERM') {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let exited = false;
for (const child of children) {
  child.on('exit', (code) => {
    if (exited) return;
    exited = true;
    shutdown();
    process.exit(code ?? 0);
  });
}
