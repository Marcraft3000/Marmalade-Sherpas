import { spawn } from 'node:child_process';
import { once } from 'node:events';
export default async function setup() {
  const endpoint = 'http://127.0.0.1:3107/api/health';
  try {
    await fetch(endpoint, { signal: AbortSignal.timeout(500) });
    throw new Error('Port 3107 is occupied. Stop the previous test server before running browser tests.');
  } catch (error) { if (error.message.startsWith('Port 3107')) throw error; }
  // Spawn Node directly: Windows shell process trees can otherwise keep the runner alive.
  const child = spawn(process.execPath, ['server/index.mjs'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, PORT: '3107', MOCK_AI: 'true', TEAM_KEY: 'offline-test', PLAN_IMPORT_DIR: 'data/test-imports', AUDIT_SESSIONS_DIR: 'data/test-sessions' } });
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error('The test server exited before becoming ready.');
    try { if ((await fetch(endpoint)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) { child.kill(); throw new Error('The test server did not become ready.'); }
  return async () => {
    if (child.exitCode !== null) return;
    const ended = once(child, 'exit');
    child.kill();
    await ended;
  };
}
