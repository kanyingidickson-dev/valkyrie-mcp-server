import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const intervalMinutes = parseInt(process.env.SCAN_INTERVAL_MINUTES || '5', 10);

function runScan() {
  const cmd = 'node scripts/scan_and_stage.js';
  const p = exec(cmd, { cwd: process.cwd() });
  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);
  p.on('exit', code => console.log(`[Scheduler] scan exited with ${code}`));
}

console.log(`[Scheduler] Starting Valkyrie scheduler: every ${intervalMinutes} minute(s)`);
runScan();
setInterval(runScan, intervalMinutes * 60 * 1000);
