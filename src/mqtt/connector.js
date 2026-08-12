import mqtt from 'mqtt';
import { env } from '../../config.js';

export function createMqttConnector(logger) {
    // MQTT broker 的连接地址与端口
    const URL = env.MQTT_URL;
    const PORT = env.MQTT_PORT;

    // 连接选项配置
    const options = {
        clientId: 'basicServer_' + Math.random().toString(16).substring(2, 8), // 随机生成客户端 ID，避免多个实例冲突
        clean: true,            // 连接时清空会话
        connectTimeout: 4000,   // 连接超时时间（毫秒）
        reconnectPeriod: 5000,  // 断线重连间隔（毫秒）
        username: 'mqtt_user',     // broker 认证用户名
        password: 'mqtt_password', // broker 认证密码
        will: {                    // 遗嘱消息：客户端异常掉线时由 broker 代为发布
            topic: '/system/availability',
            payload: JSON.stringify({
                online: false,     // 掉线时标记为离线
            }),
            qos: 2,                // 服务质量：确保恰好一次投递
            retain: true           // 保留消息：新订阅者上线即可收到
        }
    }

    let mqttClient = null;   // MQTT 客户端实例
    let isConnected = false; // 是否已建立连接
    const dispenser = new Map(); // topic -> 回调函数数组
    const triggers = [];          // 待发布的"连接就绪后"消息队列

    /**
     * 建立 MQTT 连接（单例）
     * - 首次调用时创建客户端并注册事件监听
     * - 已存在客户端时直接返回，避免重复连接
     */
    function connectMQTT() {
        if (mqttClient) {
            return;
        }
        mqttClient = mqtt.connect(`${URL}:${PORT}`, options);

        mqttClient.on('connect', () => {
            // 连接成功：发布上线状态、发送待发消息、订阅已登记的主题
            isConnected = true;
            mqttClient.publish('/system/availability', JSON.stringify({
                online: true,    // 上线标记为在线
            }), { qos: 2, retain: true });
            trigger();      // 发送连接就绪前缓存的待发消息
            subscribeAll(); // 订阅已登记的主题
        });
        mqttClient.on('message', (topic, payload) => {
            // 收到订阅主题的消息：解析 JSON 并分发到对应回调
            try {
                const data = JSON.parse(payload.toString());
                if (dispenser.has(topic)) {
                    dispense(dispenser.get(topic), data); // 调用该 topic 的回调数组
                }
            } catch (err) {
                // 记录解析或分发失败，附带主题与原始负载便于排查
                logger.log('error', `message: ${err.message}\ntopic: ${topic}\npayload: ${payload}`);
                if (dispenser.has(topic)) {
                    dispense(dispenser.get(topic), err);
                }
            }
        });
        mqttClient.on('error', (err) => {
            // 连接出错
            logger.log('error', err.message);
        });
        mqttClient.on('close', () => {
            // 连接关闭
            logger.log('info', 'MQTT连接关闭');
            isConnected = false;
        });
        mqttClient.on('offline', () => {
            // 客户端下线
            logger.log('info', 'MQTT服务下线');
            isConnected = false;
        });
    }

    /**
     * 发送连接就绪前缓存的待发消息，并清空队列
     */
    function trigger() {
        for (let pub of triggers) {
            mqttClient.publish(pub.topic, pub.payload, pub.options);
        }
        triggers.length = 0;
    }

    /**
     * 遍历回调数组逐个执行，单个回调抛错不影响后续执行
     * @param {Array} fns 回调函数数组
     * @param {*} payload 传给回调的数据
     */
    function dispense(fns, payload) {
        for (let fn of fns) {
            try {
                fn(payload);
            } catch (err) {
                logger.log('error', err.message);
            }
        }
    }

    /**
     * 对 dispenser 中已登记的所有 topic 执行订阅，并打印订阅结果
     */
    function subscribeAll() {
        for (let topic of dispenser.keys()) {
            mqttClient.subscribe(topic, null, (err, granted) => {
                if (err) return logger.log('error', err.message);
                logger.log('info', JSON.stringify(granted));
            });
        }
    }

    /**
     * 注册订阅：把回调登记到 dispenser，并在已连接时立即订阅
     * @param {string} topic 订阅主题
     * @param {Function} fn 收到该主题消息时的回调
     */
    function sub(topic, fn) {
        if (!dispenser.has(topic)) {
            dispenser.set(topic, [fn]);
        } else {
            dispenser.get(topic).push(fn);
        }
        if (isConnected) {
            mqttClient.subscribe(topic, null, (err, granted) => {
                if (err) return logger.log('error', err.message);
                logger.log('info', JSON.stringify(granted));
            });
        }
    }

    /**
     * 发布消息；未连接时先缓存，待连接后再发送
     * 缓存队列上限 100 条，超出丢弃最旧的
     * @param {object} data 含 topic、payload、options
     */
    function pub(data) {
        if (isConnected) {
            mqttClient.publish(data.topic, data.payload, data.options);
        } else {
            triggers.push(data);
            if (triggers.length > 100) {
                triggers.shift();
            }
        }
    }

    /**
     * 断开连接：先发布离线状态，再关闭客户端
     * 返回 Promise，MQTT 断开完成后 resolve
     */
    function disConnectMQTT() {
        if (!mqttClient || !isConnected) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let finished = false;
            const done = () => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                resolve();
            };
            // 兜底：连接异常时 3 秒后强制断开，避免优雅退出挂死
            const timer = setTimeout(() => {
                try {
                    mqttClient.end(true);
                } catch (err) {
                    logger.log('error', err.message);
                }
                done();
            }, 3000);

            // 先发布离线状态，发布完成后再优雅断开（end 会等待发布完成）
            mqttClient.publish('/system/availability', JSON.stringify({
                online: false,     // 断开时标记为离线
            }), { qos: 2, retain: true }, () => {
                mqttClient.endAsync(false).then(done, done);
            });
        });
    }

    return {
        connectMQTT,
        disConnectMQTT,
        pub,
        sub
    }
};
