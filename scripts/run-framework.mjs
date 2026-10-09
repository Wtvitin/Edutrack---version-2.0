import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build'].includes(command)) throw new Error('Expected dev or build.');

// Use the official Node runtime on every platform. Workers hosting needs
// a separately reviewed adapter rather than the old Vite output.
const cli = new URL('../node_modules/next/dist/bin/next', import.meta.url);
process.env.NEXT_TELEMETRY_DISABLED ??= '1';
process.argv = [process.execPath, fileURLToPath(cli), command, ...args];
await import(cli.href);
