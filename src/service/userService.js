import * as userDao from '../dao/userDao.js';
import log from '../dao/logDao.js';
import path from 'node:path';
import fs from 'node:fs'

function registerUser(user) {
    try {
        const result = userDao.registerUser(user);
        log('info', `user ${user.username} registered successfully`);
        const id = result.lastInsertRowid;
        return { success: true, id: id };
    } catch (err) {
        log('error', err.message);
        if (err.code === 100001) {
            return { success: false, code: err.code, message: '该用户已存在' };
        }
        throw err;
    }
}

function getUserByUsername(username) {
    const user = userDao.getUserByUsername(username);
    return user === undefined ? null : user;
}

function exportUser() {
    const users = userDao.exportUser();
    const usersJson = JSON.stringify(users, null, 2);
    const filePath = `./exports/users.json`;
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, usersJson);
        return { success: true, filePath: filePath };
    } catch (err) {
        log('error', `导出用户数据失败：[${err.name}] ${err.message}`);
        return { success: false, filePath: null };
    }
}

export default { registerUser, getUserByUsername, exportUser };