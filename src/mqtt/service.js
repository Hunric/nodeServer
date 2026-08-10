import { sub, pub } from './connector.js';
import log from '../dao/logDao.js';
import userService from '../service/userService.js';
import generateMD5 from '../utils/crypto.js';

const REGISTER_RESULT_TOPIC = '/api/v1/rest/users/register-result';

function requireFields(data, fields) {
    const missing = fields.filter(f => data[f] === undefined || data[f] === null || data[f] === '');
    if (missing.length > 0) {
        return `缺少必要参数: ${missing.join(', ')}`;
    }
    return '';
}

function registerMqttServer() {
    sub('/api/v1/rest/users/register', (payload) => {
        if (payload instanceof Error) return pubError(REGISTER_RESULT_TOPIC, { error: 500, message: payload.message });
        if (payload == null) return pubError(REGISTER_RESULT_TOPIC, { error: 400, message: '请求体为空' });
        const isMissing = requireFields(payload, ['username', 'password']);
        if (isMissing) return pubError(REGISTER_RESULT_TOPIC, { error: 400, message: isMissing });

        payload['username'] = String(payload['username']);
        payload['password'] = generateMD5(String(payload['password']));

        try {
            const result = userService.registerUser(payload);
            if (!result.success) {
                return pubError(REGISTER_RESULT_TOPIC, { error: result.code, message: result.message });
            }
            return pubOk(REGISTER_RESULT_TOPIC, { error: 0, data: { userId: result.id }, message: '用户注册成功' });
        } catch (err) {
            log('error', err.message);
            pubError(REGISTER_RESULT_TOPIC, { error: 500, message: '服务器内部错误' });
        }
    })
}

function pubError(topic, payload) {
    log('error', `mqtt error: [topic] ${topic}\n[message] ${payload.message}`);
    pub({
        topic: topic,
        payload: JSON.stringify(payload),
        options: { qos: 2, retain: false }
    });
}

function pubOk(topic, payload) {
    log('info', `mqtt info: [topic] ${topic}\n[message] ${payload.message}`);
    pub({
        topic: topic,
        payload: JSON.stringify(payload),
        options: { qos: 2, retain: false }
    });
}

export default registerMqttServer;