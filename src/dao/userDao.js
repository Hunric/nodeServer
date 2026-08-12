import { BusinessError } from '../error/businessError.js';

export function createUserDao(db) {
    function registerUser(user) {
        try {
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
        const getUserByUsernameSql = db.prepare('SELECT id,username,created_at FROM users WHERE username = ?');
        return getUserByUsernameSql.get(username);
    }

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