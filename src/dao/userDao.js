/**
 * 用户数据访问层（DAO）
 * - 封装用户表的增删查等数据库操作
 */
import { BusinessError } from '../error/businessError.js';

/**
 * 创建用户 DAO 实例
 * @param {object} db better-sqlite3 数据库实例
 */
export function createUserDao(db) {
    /**
     * 插入新用户记录
     * @param {{username: string, password: string}} user 用户名与加密后的密码
     * @returns {object} better-sqlite3 run 结果（含 lastInsertRowid）
     * @throws {BusinessError} 用户名重复时抛出业务异常（code: 100001）
     */
    function registerUser(user) {
        try {
            const registerUserSql = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
            return registerUserSql.run(user.username, user.password);
        } catch (err) {
            // 捕获唯一约束冲突：用户名已存在
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new BusinessError(100001, 'user already exists');
            }
            throw err;
        }
    }

    /**
     * 按用户名查询用户（不返回密码字段）
     * @param {string} username 用户名
     * @returns {object|undefined} 用户记录；不存在时返回 undefined
     */
    function getUserByUsername(username) {
        const getUserByUsernameSql = db.prepare('SELECT id,username,created_at FROM users WHERE username = ?');
        return getUserByUsernameSql.get(username);
    }

    /**
     * 查询全部用户数据
     * @returns {Array<object>} 用户记录数组
     */
    function exportUser() {
        const exportUserSql = db.prepare('SELECT * FROM users');
        return exportUserSql.all();
    }

    return {
        registerUser,
        getUserByUsername,
        exportUser
    }
};
