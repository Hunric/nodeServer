import { connectDB } from './src/db/connector.js';
import { initDB } from './src/db/schema.js';
import { connectMQTT, disConnectMQTT } from './src/mqtt/connector.js';
import http from 'node:http';
import { matchRoute } from './src/controller/routor.js';
import Response from './src/dto/response.js';
import './src/controller/index.js';
import registerMqttServer from './src/mqtt/service.js';

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

// 注册 MQTT 服务
registerMqttServer();

// 程序退出
let shuttingDown = false;
function shutdown(signal) {
    if (shuttingDown) {           // 第二次收到信号（比如再按一次 Ctrl+C）强制退出
        console.log('强制退出');
        process.exit(1);
    }
    shuttingDown = true;
    console.log(`收到 ${signal}，正在优雅退出...`);

    // 1. 停止接收新 HTTP 请求，等存量请求处理完
    server.close(() => {
        // 3. 关闭数据库
        db.close();
        process.exit(0);
    });
    server.closeAllConnections(); // 关掉空闲 keep-alive 连接

    // 2. MQTT：发布离线状态 + 断开
    disConnectMQTT();

    // 4. 超时兜底，防止某些连接一直不结束导致挂死
    setTimeout(() => {
        console.error('优雅退出超时，强制退出');
        process.exit(1);
    }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // kill 命令