import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DBHOST ?? "db",
  port: Number(process.env.DBPORT ?? 3306),
  user: process.env.HELIX7_DBUSER ?? process.env.DBUSER,
  password: process.env.HELIX7_DBPASS ?? process.env.DBPASS,
  database: process.env.HELIX7_DBNAME ?? "helix7",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

export default pool;
