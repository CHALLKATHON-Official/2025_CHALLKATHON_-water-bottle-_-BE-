// dbconfig.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,     // db.fxzyfriuplqjcdbqafym.supabase.co
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'postgres',
  ssl: {
    rejectUnauthorized: false,   // Supabase에선 꼭 필요
  },
});

module.exports = pool;
