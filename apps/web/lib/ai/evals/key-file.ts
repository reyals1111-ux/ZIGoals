import {readFileSync, statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

/**
 * Session AI (A1, ADR-034 N6): the real-model harness reads the owner's test key from its own file, so the key is never
 * exported in a shell, passed as an argument, printed or written. The file must be readable by its owner only (mode
 * 0600 or stricter); anything else is refused. The key is returned for this process's memory only; callers send it to
 * the Anthropic API origin and nowhere else. Errors name the file and the variable, never any part of the value.
 */
export const DEFAULT_KEY_FILE = join(homedir(), '.config', 'zigoals', 'anthropic-test.env');
export function readKeyFile(path = process.env.ZIGI_KEY_FILE || DEFAULT_KEY_FILE, name = 'ANTHROPIC_TEST_KEY'): string {
  let mode: number;
  try { mode = statSync(path).mode; } catch { throw new Error(`The key file ${path} is not there.`); }
  if (mode & 0o077) throw new Error(`The key file ${path} is readable by others (mode ${(mode & 0o777).toString(8)}); chmod 600 it first.`);
  const line = readFileSync(path, 'utf8').split(/\r?\n/).find(l => l.startsWith(`${name}=`) || l.startsWith(`export ${name}=`));
  const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2') ?? '';
  if (!value) throw new Error(`The key file ${path} has no ${name}.`);
  return value;
}
