import { registerController } from './routor.js';
import log from '../dao/logDao.js';
import Response from '../dto/response.js';
import userService from '../service/userService.js';
import generateMD5 from '../utils/crypto.js';

function requireFields(data, fields) {
    const missing = fields.filter(f => data[f] === undefined || data[f] === null || data[f] === '');
    if (missing.length > 0) {
        return `缺少必要参数: ${missing.join(', ')}`;
    }
    return '';
}

class UserController {
    constructor() {
        this.prefix = '/api/v1/rest/users';
        this.routes = [
            {
                method: 'POST',
                path: '/register',
                fn: this.register.bind(this)
            },
            {
                method: 'GET',
                path: '',
                fn: this.getUserByName.bind(this)
            },
            {
                method: 'POST',
                path: '/export',
                fn: this.exportUsers.bind(this)
            }
        ];
    }
    getUserByName(req, res) {
        const name = req.context['url'].searchParams.get('username');
        if (name == null) return Response.err(res, 400, '参数 username 必须');
        const userInfo = userService.getUserByUsername(name);
        if (userInfo == null) return Response.err(res, 404, `查询的用户 ${name} 不存在`);
        Response.ok(res, userInfo, '查询成功');
    }
    register(req, res) {
        const chunks = [];
        req.on('data', chunk => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
                if (data == null) return Response.err(res, 400, '请求体为空');
                const isMissing = requireFields(data, ['username', 'password']);
                if (isMissing) return Response.err(res, 400, isMissing);
                data['username'] = String(data['username']);
                data['password'] = generateMD5(String(data['password']));

                const result = userService.registerUser(data);
                if (!result.success) {
                    return Response.err(res, result.code, result.message);
                }
                return Response.ok(res, { userId: result.id }, '用户注册成功');
            } catch (err) {
                log('error', `用户注册失败: ${err.message}`);
                if (err.name === 'SyntaxError') {
                    Response.err(res, 400, 'json 格式错误');
                } else {
                    Response.err(res, 500, '服务器内部错误');
                }
            }
        })
    }
    exportUsers(req, res) {
        try {
            const result = userService.exportUser();
            if (!result.success) return Response.err(res, 500, '用户数据导出失败');
            Response.ok(res, { filePath: result.filePath }, '用户数据导出成功');
        } catch (err) {
            log('error', err.message);
            Response.err(res, 500, '系统内部错误');
        }

    }
}

try {
    registerController(UserController);
} catch (err) {
    log('error', `UserController 注册失败：${err.message}`);
}