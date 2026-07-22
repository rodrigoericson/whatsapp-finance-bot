import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const authPath = resolve(process.cwd(), process.env.WA_SESSION_PATH ?? './auth_info');

await rm(authPath, { recursive: true, force: true });
console.log(`Sessão removida: ${authPath}`);
