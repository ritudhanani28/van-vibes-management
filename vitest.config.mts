import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Automatically load .env.local (or fallback to .env.example) into process.env for unit tests
const envFile = fs.existsSync(path.resolve(import.meta.dirname, '.env.local'))
  ? '.env.local'
  : '.env.example';

const envPath = path.resolve(import.meta.dirname, envFile);
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
