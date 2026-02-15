import { Client } from 'ssh2';
import type { SshConfig } from '../config/asteriskConfig';

/**
 * Execute a command on the Asterisk server via SSH.
 * Used for: writing configs, reloading Asterisk, etc.
 */
export async function runSshCommand(cfg: SshConfig, command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          stream
            .on('close', (code: number) => {
              conn.end();
              resolve({ stdout, stderr });
            })
            .on('data', (chunk: Buffer | string) => {
              stdout += chunk.toString();
            })
            .stderr.on('data', (chunk: Buffer | string) => {
              stderr += chunk.toString();
            });
        });
      })
      .on('error', reject)
      .connect({
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        readyTimeout: 10000,
      });
  });
}

/**
 * Write content to a file on the remote Asterisk server via SFTP.
 */
export async function writeRemoteFile(cfg: SshConfig, remotePath: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          const tmpPath = `${remotePath}.tmp.${Date.now()}`;
          const stream = sftp.createWriteStream(tmpPath);
          stream.on('close', () => {
            sftp.rename(tmpPath, remotePath, (renameErr) => {
              conn.end();
              if (renameErr) reject(renameErr);
              else resolve();
            });
          });
          stream.on('error', (e: Error) => {
            conn.end();
            reject(e);
          });
          stream.write(content, 'utf8', () => stream.end());
        });
      })
      .on('error', reject)
      .connect({
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        readyTimeout: 10000,
      });
  });
}

/**
 * Run asterisk -rx "reload" on the remote server.
 */
export async function reloadAsterisk(cfg: SshConfig): Promise<{ stdout: string; stderr: string }> {
  return runSshCommand(cfg, 'asterisk -rx "reload"');
}
