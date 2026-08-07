/**
 * 初始化数据库表结构
 */
function initDB(db) {
    if (!db) {
        throw new Error('数据库连接未初始化');
    }
    
    try {
        // 创建用户表
        db.exec(`
        CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

        // 创建日志表
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
}

export { initDB };