import db from './connector.js';

/**
 * 初始化日志表结构
 */
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        level TEXT NOT NULL, 
        message TEXT NOT NULL, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )strict;
    `);
} catch (error) {
    console.error(`初始化日志表失败: [${error.code}] ${error.message} \n${error.stack}`);
    throw error;
}