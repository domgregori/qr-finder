#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const serverPath = path.join(__dirname, '..', 'dist', 'apps', 'admin', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error('Missing packaged admin server. Reinstall package or republish with prepack output.');
  process.exit(1);
}

const child = spawn(process.execPath, [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '3000',
    HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
