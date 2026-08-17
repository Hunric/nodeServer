/**
 * 数据库表结构定义
 * - 负责创建应用所需的全部数据表（使用 IF NOT EXISTS，可重复执行）
 */

/**
 * 初始化数据库表结构
 * @param {object} db better-sqlite3 数据库实例
 */
export function initDB(db) {
    if (!db) {
        throw new Error('数据库连接未初始化');
    }
    
    try {
        // 创建用户表：存储注册用户信息，username 唯一
        db.exec(`
        CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

        // 创建系统日志表：记录应用运行日志
        db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        level TEXT NOT NULL, 
        message TEXT NOT NULL, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    } catch (error) {
        console.error(`初始化数据库表结构失败: [${error.code}] ${error.message} \n${error.stack}`);
        throw error;
    }
};
