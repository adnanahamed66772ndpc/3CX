import pool from '../db/pool';
import * as repoSettings from '../db/repoSettings';

export interface AriConfig {
  ariUrl: string;
  ariUser: string;
  ariPass: string;
  ariApp: string;
}

export interface AmiConfig {
  amiHost: string;
  amiPort: number;
  amiUser: string;
  amiPass: string;
}

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

function envAriConfig(): AriConfig {
  return {
    ariUrl: process.env.ARI_URL || 'http://127.0.0.1:8088',
    ariUser: process.env.ARI_USER || '',
    ariPass: process.env.ARI_PASS || '',
    ariApp: process.env.ARI_APP || 'myapp',
  };
}

function envAmiConfig(): AmiConfig {
  return {
    amiHost: process.env.AMI_HOST || '127.0.0.1',
    amiPort: Number(process.env.AMI_PORT || 5038),
    amiUser: process.env.AMI_USER || '',
    amiPass: process.env.AMI_PASS || '',
  };
}

/** Resolve ARI config: DB overrides env when DB has values. */
export async function getAriConfig(): Promise<AriConfig | null> {
  const db = await repoSettings.getAsteriskSettings(pool);
  const env = envAriConfig();
  if (db?.ari_user && db?.ari_pass) {
    return {
      ariUrl: db.ari_url || env.ariUrl,
      ariUser: db.ari_user,
      ariPass: db.ari_pass,
      ariApp: db.ari_app || env.ariApp,
    };
  }
  if (env.ariUser && env.ariPass) return env;
  return null;
}

/** Resolve AMI config: DB overrides env when DB has values. */
export async function getAmiConfig(): Promise<AmiConfig | null> {
  const db = await repoSettings.getAsteriskSettings(pool);
  const env = envAmiConfig();
  if (db?.ami_user && db?.ami_pass) {
    return {
      amiHost: db.ami_host || env.amiHost,
      amiPort: db.ami_port ?? env.amiPort,
      amiUser: db.ami_user,
      amiPass: db.ami_pass,
    };
  }
  if (env.amiUser && env.amiPass) return env;
  return null;
}

function envSshConfig(): SshConfig | null {
  const host = process.env.SSH_HOST;
  const user = process.env.SSH_USER;
  const pass = process.env.SSH_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SSH_PORT || 22),
    username: user,
    password: pass,
  };
}

/** Resolve SSH config: DB overrides env when DB has values. */
export async function getSshConfig(): Promise<SshConfig | null> {
  const db = await repoSettings.getAsteriskSettings(pool);
  const env = envSshConfig();
  if (db?.ssh_host && db?.ssh_user && db?.ssh_pass) {
    return {
      host: db.ssh_host,
      port: db.ssh_port ?? 22,
      username: db.ssh_user,
      password: db.ssh_pass,
    };
  }
  return env;
}
