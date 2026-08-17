/**
 * 数据库连接器
 * - 基于 better-sqlite3 建立数据库连接（单例）
 * - 连接前确保数据目录存在，连接成功后初始化表结构
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { initDB } from './schema.js';
import { env } from '../../config.js';

/**
 * 创建数据库连接器
 */
export function createConnector() {
    const DB_PATH = env.DB_PATH;
    // 确保数据库文件所在目录存在（不存在则递归创建）
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

    let db = null; // 数据库实例（单例缓存）

    /**
     * 建立数据库连接（单例）：首次调用创建连接，后续调用直接复用
     * @returns {object} better-sqlite3 数据库实例
     */
    function connectDB() {
        if (db) {
            initDB(db); // 已有连接时仅确保表结构存在
            return db;
        }
        try {
            db = new Database(DB_PATH);
            initDB(db); // 初始化表结构
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
