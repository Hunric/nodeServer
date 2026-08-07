import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/index.js';

const DB_PATH = env.DB_PATH;
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;
function connectDB() {
    if (db) {
        return db;
    }
    try {
        db = new Database(DB_PATH);
        return db;
    } catch (err) {
        console.error(`数据库连接失败: [${err.code}] ${err.message} \n${err.stack}`);
        throw err;
    }
}

function getDB() {
    return db;
}

export { connectDB, getDB };