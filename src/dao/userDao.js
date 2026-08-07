import { getDB } from '../db/connector.js';
import BusinessError from '../error/businessError.js';

function registerUser(user) {
    try {
        const db = getDB();
        const registerUserSql = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        return registerUserSql.run(user.username, user.password);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new BusinessError(100001, 'user already exists');
        }
        throw err;
    }
}

function getUserByUsername(username) {
    const db = getDB();
    const getUserByUsernameSql = db.prepare('SELECT id,username,created_at FROM users WHERE username = ?');
    return getUserByUsernameSql.get(username);
}

function exportUser(){
    const db = getDB();
    const exportUserSql = db.prepare('SELECT * FROM users');
    return exportUserSql.all();
}

export { registerUser, getUserByUsername, exportUser };