export function createLogDao(db) {
    function log(level, message) {
        const logSql = db.prepare('INSERT INTO system_logs (level, message) VALUES (?, ?)');
        return logSql.run(level, message);
    }

    return {
        log
    };
};
