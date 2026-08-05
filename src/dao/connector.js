import 'dotenv/config';
import Database from 'better-sqlite3';

let db = null;

function connectDB() {
    if (db) {
        return db;
    }
    try {
        db = new Database(process.env.DB_PATH || './data/system.db');
        return db;
    } catch (err) {
        console.error(`数据库连接失败: [${err.code}] ${err.message} \n${err.stack}`);
        throw err;
    }
}

export { connectDB, db };