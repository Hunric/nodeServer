/**
 * 日志数据访问层（DAO）
 * - 负责将应用日志写入 system_logs 表
 */

/**
 * 创建日志 DAO 实例
 * @param {object} db better-sqlite3 数据库实例
 */
export function createLogDao(db) {
    /**
     * 写入一条日志记录
     * @param {string} level 日志级别（如 info / error）
     * @param {string} message 日志内容
     * @returns {object} better-sqlite3 run 结果
     */
    function log(level, message) {
        const logSql = db.prepare('INSERT INTO system_logs (level, message) VALUES (?, ?)');
        return logSql.run(level, message);
    }

    return {
        log
    };
};
