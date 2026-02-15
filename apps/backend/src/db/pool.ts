import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'telephony',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DB || 'telephony',
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
});

export async function getPool(): Promise<mysql.Pool> {
  return pool;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT 1 AS ok');
    return rows?.[0]?.ok === 1;
  } catch {
    return false;
  }
}

export default pool;
