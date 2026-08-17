import { generateMD5 } from '../utils/crypto.js';

export function createMqttService(mqttConnector, userService, logger) {
    const REGISTER_RESULT_TOPIC = '/api/v1/rest/users/register-result';

    function requireFields(data, fields) {
        const missing = fields.filter(f => data[f] === undefined || data[f] === null || data[f] === '');
        if (missing.length > 0) {
            return `缺少必要参数: ${missing.join(', ')}`;
        }
        return '';
    }

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
            data['password'] = generateMD5(String(data['password']));

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
        })
    }

    function pubError(topic, payload) {
        logger.log('error', `mqtt error: [topic] ${topic}\n[message] ${payload.message}`);
        mqttConnector.pub({
            topic: topic,
            payload: JSON.stringify(payload),
            options: { qos: 2, retain: false }
        });
    }

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