import http from 'node:http';
import { compose } from './compositionRoot.js';
import { Response } from './src/dto/response.js';

// 初始化数据库并组装实例
console.log('[启动] 正在初始化数据库与各服务实例...');
const { db, routor, mqttConnector, mqttService } = compose();
console.log('[启动] 实例组装完成');

// 创建HTTP服务器
let ready = false;
const server = http.createServer({
    headersTimeout: 5000,
    requestTimeout: 10000
}, (req, res) => {
    if (ready) {
        routor.matchRoute(req, res);
    } else {
        Response.err(res, 100002, '系统初始化中');
    }
});
server.once('listening', () => console.log('[启动] HTTP 服务器已启动，监听端口 3000'));
server.on('error', (err) => console.error('[启动] HTTP 服务器启动失败:', err.message));
server.listen(3000);
setTimeout(() => {
    ready = true;
    console.log('[启动] 系统初始化完成，开始接收请求');
}, 10_000);

// 连接MQTT
console.log('[启动] 正在连接 MQTT...');
mqttConnector.connectMQTT();
console.log('[启动] MQTT 连接完成');

// 注册 MQTT 服务
console.log('[启动] 正在注册 MQTT 服务...');
mqttService.registerMqttServer();
console.log('[启动] MQTT 服务注册完成');

// 程序退出
let shuttingDown = false;
function shutdown(signal) {
    if (shuttingDown) {           // 第二次收到信号（比如再按一次 Ctrl+C）强制退出
        console.log('强制退出');
        process.exit(1);
    }
    shuttingDown = true;
    console.log(`[关闭] 收到 ${signal}，正在优雅退出...`);

    // 1. 停止接收新 HTTP 请求，等存量请求处理完
    console.log('[关闭] 正在关闭 HTTP 服务器...');
    const httpDone = new Promise((resolve) => {
        server.close(() => {
            console.log('[关闭] HTTP 服务器已关闭');
            resolve();
        });
        server.closeAllConnections(); // 关掉空闲 keep-alive 连接
    });

    // 2. MQTT：发布离线状态 + 断开
    console.log('[关闭] 正在断开 MQTT 连接...');
    const mqttDone = mqttConnector.disConnectMQTT();

    // 3. HTTP 与 MQTT 都完成后，关闭数据库并退出
    Promise.allSettled([httpDone, mqttDone]).then(() => {
        console.log('[关闭] HTTP 与 MQTT 均已关闭，正在关闭数据库...');
        try {
            db.close();
            console.log('[关闭] 数据库已关闭');
        } catch (err) {
            console.error(`关闭数据库失败: ${err.message}`);
        }
        console.log('[关闭] 已安全退出');
        process.exit(0);
    });

    // 4. 超时兜底，防止某些连接一直不结束导致挂死
    setTimeout(() => {
        console.error('优雅退出超时，强制退出');
        process.exit(1);
    }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // kill 命令
