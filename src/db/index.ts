import pg from 'pg'

export const pool = new pg.Pool({
  connectionString: process.env.DSN,
  connectionTimeoutMillis: 5000
})
