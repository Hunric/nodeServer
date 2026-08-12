import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { initDB } from './schema.js';
import { env } from '../../config.js';

export function createConnector() {
    const DB_PATH = env.DB_PATH;
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

    let db = null;
    function connectDB() {
        if (db) {
            initDB(db);
            return db;
        }
        try {
            db = new Database(DB_PATH);
            initDB(db);
            return db;
        } catch (err) {
            console.error(`数据库连接失败: [${err.code}] ${err.message} \n${err.stack}`);
            throw err;
        }
    }

    return {
        connectDB,
    };
};