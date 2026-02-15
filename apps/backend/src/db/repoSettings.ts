import type { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export interface AsteriskSettings {
  ari_url: string | null;
  ari_user: string | null;
  ari_pass: string | null;
  ari_app: string | null;
  ami_host: string | null;
  ami_port: number | null;
  ami_user: string | null;
  ami_pass: string | null;
  ssh_host: string | null;
  ssh_port: number | null;
  ssh_user: string | null;
  ssh_pass: string | null;
  updated_at: string | null;
}

/** For API display: mask passwords */
export interface AsteriskSettingsDisplay extends Omit<AsteriskSettings, 'ari_pass' | 'ami_pass' | 'ssh_pass'> {
  ari_pass_set: boolean;
  ami_pass_set: boolean;
  ssh_pass_set: boolean;
}

export async function getAsteriskSettings(p: Pool): Promise<AsteriskSettings | null> {
  try {
    const [rows] = await p.execute<RowDataPacket[]>(
      'SELECT ari_url, ari_user, ari_pass, ari_app, ami_host, ami_port, ami_user, ami_pass, ssh_host, ssh_port, ssh_user, ssh_pass, updated_at FROM asterisk_settings WHERE id = 1'
    );
    const r = Array.isArray(rows) ? (rows[0] as AsteriskSettings) : null;
    return r ?? null;
  } catch {
    return null;
  }
}

export async function getAsteriskSettingsForDisplay(p: Pool): Promise<AsteriskSettingsDisplay | null> {
  const s = await getAsteriskSettings(p);
  if (!s) return null;
  return {
    ari_url: s.ari_url,
    ari_user: s.ari_user,
    ari_pass_set: !!s.ari_pass,
    ari_app: s.ari_app,
    ami_host: s.ami_host,
    ami_port: s.ami_port,
    ami_user: s.ami_user,
    ami_pass_set: !!s.ami_pass,
    ssh_host: s.ssh_host,
    ssh_port: s.ssh_port,
    ssh_user: s.ssh_user,
    ssh_pass_set: !!s.ssh_pass,
    updated_at: s.updated_at,
  };
}

export async function upsertAsteriskSettings(
  p: Pool,
  data: Partial<AsteriskSettings>
): Promise<void> {
  const existing = await getAsteriskSettings(p);
  const merged: AsteriskSettings = {
    ari_url: data.ari_url !== undefined ? data.ari_url : existing?.ari_url ?? null,
    ari_user: data.ari_user !== undefined ? data.ari_user : existing?.ari_user ?? null,
    ari_pass: data.ari_pass !== undefined && data.ari_pass !== '' ? data.ari_pass : existing?.ari_pass ?? null,
    ari_app: data.ari_app !== undefined ? data.ari_app : existing?.ari_app ?? null,
    ami_host: data.ami_host !== undefined ? data.ami_host : existing?.ami_host ?? null,
    ami_port: data.ami_port !== undefined ? data.ami_port : existing?.ami_port ?? null,
    ami_user: data.ami_user !== undefined ? data.ami_user : existing?.ami_user ?? null,
    ami_pass: data.ami_pass !== undefined && data.ami_pass !== '' ? data.ami_pass : existing?.ami_pass ?? null,
    ssh_host: data.ssh_host !== undefined ? data.ssh_host : existing?.ssh_host ?? null,
    ssh_port: data.ssh_port !== undefined ? data.ssh_port : existing?.ssh_port ?? null,
    ssh_user: data.ssh_user !== undefined ? data.ssh_user : existing?.ssh_user ?? null,
    ssh_pass: data.ssh_pass !== undefined && data.ssh_pass !== '' ? data.ssh_pass : existing?.ssh_pass ?? null,
    updated_at: null,
  };
  await p.execute(
    `INSERT INTO asterisk_settings (id, ari_url, ari_user, ari_pass, ari_app, ami_host, ami_port, ami_user, ami_pass, ssh_host, ssh_port, ssh_user, ssh_pass, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE
       ari_url = VALUES(ari_url), ari_user = VALUES(ari_user), ari_pass = VALUES(ari_pass), ari_app = VALUES(ari_app),
       ami_host = VALUES(ami_host), ami_port = VALUES(ami_port), ami_user = VALUES(ami_user), ami_pass = VALUES(ami_pass),
       ssh_host = VALUES(ssh_host), ssh_port = VALUES(ssh_port), ssh_user = VALUES(ssh_user), ssh_pass = VALUES(ssh_pass),
       updated_at = NOW(3)`,
    [
      merged.ari_url, merged.ari_user, merged.ari_pass, merged.ari_app,
      merged.ami_host, merged.ami_port, merged.ami_user, merged.ami_pass,
      merged.ssh_host, merged.ssh_port, merged.ssh_user, merged.ssh_pass,
    ]
  );
}
