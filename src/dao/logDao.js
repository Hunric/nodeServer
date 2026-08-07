import { getDB } from '../db/connector.js';

function log(level, message){
    const db = getDB();
    const logSql = db.prepare('INSERT INTO system_logs (level, message) VALUES (?, ?)');
    return logSql.run(level, message);
}

export default log;
