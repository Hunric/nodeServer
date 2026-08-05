import db from './connector.js';

/**
 * 初始化用户表结构
 */
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )strict;
    `);
} catch (error) {
    console.error(`初始化用户表失败: [${error.code}] ${error.message} \n${error.stack}`);
    throw error;
}