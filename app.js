import { connectDB } from './src/db/connector.js';
import { initDB } from './src/db/schema.js';
import { connectMQTT } from './src/mqtt/connector.js';
import http from 'node:http';
import { matchRoute } from './src/controller/routor.js';
import Response from './src/dto/response.js';
import './src/controller/index.js';

// 初始化数据库
const db = connectDB();
initDB(db);

// 创建HTTP服务器
let ready = false;
const server = http.createServer({
    headersTimeout: 5000,
    requestTimeout: 10000
}, (req, res) => {
    if (ready) {
        matchRoute(req, res);
    } else {
        Response.err(res, 100002, '系统初始化中');
    }
});
server.listen(3000);
setTimeout(() => ready = true, 10_000);

// 连接MQTT
connectMQTT();