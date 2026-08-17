/**
 * MQTT 服务层
 * - 负责订阅业务主题、解析消息内容、调用业务服务并发布处理结果
 */
import { generateMD5 } from '../utils/crypto.js';

/**
 * 创建 MQTT 服务实例
 * @param {object} mqttConnector MQTT 连接器（提供 sub / pub）
 * @param {object} userService 用户业务服务
 * @param {object} logger 日志记录器
 */
export function createMqttService(mqttConnector, userService, logger) {
    // 注册结果回执主题：注册处理完成后将结果发布到该主题
    const REGISTER_RESULT_TOPIC = '/api/v1/rest/users/register-result';

    /**
     * 校验必填字段：存在 undefined / null / 空字符串 即视为缺失
     * @param {object} data 请求数据
     * @param {string[]} fields 必填字段名列表
     * @returns {string} 缺失字段提示；全部通过返回空字符串
     */
    function requireFields(data, fields) {
        const missing = fields.filter(f => data[f] === undefined || data[f] === null || data[f] === '');
        if (missing.length > 0) {
            return `缺少必要参数: ${missing.join(', ')}`;
        }
        return '';
    }

    /**
     * 注册 MQTT 订阅服务：监听用户注册主题
     * - 解析 JSON 并校验格式与必填参数（格式错误返回 400）
     * - 密码 MD5 加密后调用注册业务，结果发布到回执主题
     */
    function registerMqttServer() {
        mqttConnector.sub('/api/v1/rest/users/register', (payload) => {
            // connector 只转发原始 payload（Buffer），此处按需自行解析：格式错误返回 400
            let data;
            try {
                data = JSON.parse(payload.toString());
            } catch (err) {
                logger.log('error', `invalid json: ${err.message}\npayload: ${payload}`);
                return pubError(REGISTER_RESULT_TOPIC, { error: 400, message: '请求体不是合法的 JSON 格式' });
            }
            if (data == null) return pubError(REGISTER_RESULT_TOPIC, { error: 400, message: '请求体为空' });
            const isMissing = requireFields(data, ['username', 'password']);
            if (isMissing) return pubError(REGISTER_RESULT_TOPIC, { error: 400, message: isMissing });

            data['username'] = String(data['username']);
            data['password'] = generateMD5(String(data['password'])); // 密码加密后入库

            try {
                const result = userService.registerUser(data);
                if (!result.success) {
                    return pubError(REGISTER_RESULT_TOPIC, { error: result.code, message: result.message });
                }
                return pubOk(REGISTER_RESULT_TOPIC, { error: 0, data: { userId: result.id }, message: '用户注册成功' });
            } catch (err) {
                logger.log('error', err.message);
                pubError(REGISTER_RESULT_TOPIC, { error: 500, message: '服务器内部错误' });
            }
        }, {
            qos: 2 // 订阅 QoS：确保消息恰好一次投递
        })
    }

    /**
     * 发布失败回执：记录错误日志后以 qos=2 发布失败结果
     */
    function pubError(topic, payload) {
        logger.log('error', `mqtt error: [topic] ${topic}\n[message] ${payload.message}`);
        mqttConnector.pub({
            topic: topic,
            payload: JSON.stringify(payload),
            options: { qos: 2, retain: false }
        });
    }

    /**
     * 发布成功回执：记录信息日志后以 qos=2 发布成功结果
     */
    function pubOk(topic, payload) {
        logger.log('info', `mqtt info: [topic] ${topic}\n[message] ${payload.message}`);
        mqttConnector.pub({
            topic: topic,
            payload: JSON.stringify(payload),
            options: { qos: 2, retain: false }
        });
    }

    return {
        registerMqttServer
    }
};
