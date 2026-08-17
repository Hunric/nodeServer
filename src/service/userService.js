/**
 * 用户业务服务层
 * - 封装用户相关的业务逻辑（注册、查询、导出）
 */
import path from 'node:path';
import fs from 'node:fs'

/**
 * 创建用户服务实例
 * @param {object} userDao 用户 DAO
 * @param {object} logger 日志记录器
 */
export function createUserService(userDao, logger) {
    /**
     * 注册用户
     * @param {{username: string, password: string}} user 用户名与加密后的密码
     * @returns {{success: boolean, id?: number, code?: number, message?: string}}
     *          成功返回 { success: true, id }；用户名重复返回 { success: false, code: 100001, message }
     */
    function registerUser(user) {
        try {
            const result = userDao.registerUser(user);
            logger.log('info', `user ${user.username} registered successfully`);
            const id = result.lastInsertRowid; // 取自增主键作为新用户 ID
            return { success: true, id: id };
        } catch (err) {
            logger.log('error', err.message);
            if (err.code === 100001) {
                return { success: false, code: err.code, message: '该用户已存在' };
            }
            throw err; // 未知异常向上抛出，由调用方兜底处理
        }
    }

    /**
     * 按用户名查询用户
     * @param {string} username 用户名
     * @returns {object|null} 用户记录；不存在返回 null
     */
    function getUserByUsername(username) {
        const user = userDao.getUserByUsername(username);
        return user === undefined ? null : user;
    }

    /**
     * 导出全部用户数据到 exports/users.json
     * @returns {{success: boolean, filePath?: string|null}} 成功返回文件路径，失败 filePath 为 null
     */
    function exportUser() {
        const users = userDao.exportUser();
        const usersJson = JSON.stringify(users, null, 2); // 缩进 2 空格格式化输出
        const filePath = `./exports/users.json`;
        try {
            // 确保导出目录存在，再写入 JSON 文件
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, usersJson);
            return { success: true, filePath: filePath };
        } catch (err) {
            logger.log('error', `导出用户数据失败：[${err.name}] ${err.message}`);
            return { success: false, filePath: null };
        }
    }

    return {
        registerUser,
        getUserByUsername,
        exportUser
    }
};
