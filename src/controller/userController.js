/**
 * 用户控制器
 * - 提供用户注册、按用户名查询、导出用户数据三个接口
 */
import { Response } from '../dto/response.js';
import { generateMD5 } from '../utils/crypto.js';

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

export class UserController {
    /**
     * @param {object} userService 用户业务服务
     * @param {object} logger 日志记录器
     */
    constructor(userService, logger) {
        this.userService = userService;
        this.logger = logger;
        this.prefix = '/api/v1/rest/users'; // 路由前缀
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

    /**
     * GET ?username=xxx：按用户名查询用户，不存在返回 404
     */
    getUserByName(req, res) {
        const name = req.context['url'].searchParams.get('username');
        if (name == null) return Response.err(res, 400, '参数 username 必须');
        const userInfo = this.userService.getUserByUsername(name);
        if (userInfo == null) return Response.err(res, 404, `查询的用户 ${name} 不存在`);
        Response.ok(res, userInfo, '查询成功');
    }

    /**
     * POST /register：注册用户
     * - 逐块收集请求体并解析为 JSON
     * - 校验 username / password 必填，密码 MD5 加密后入库
     */
    register(req, res) {
        const chunks = []; // 请求体数据块缓存
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
                data['password'] = generateMD5(String(data['password'])); // 密码加密后再入库

                const result = this.userService.registerUser(data);
                if (!result.success) {
                    return Response.err(res, result.code, result.message);
                }
                return Response.ok(res, { userId: result.id }, '用户注册成功');
            } catch (err) {
                this.logger.log('error', `用户注册失败: ${err.message}`);
                if (err.name === 'SyntaxError') {
                    Response.err(res, 400, 'json 格式错误'); // 请求体不是合法 JSON
                } else {
                    Response.err(res, 500, '服务器内部错误');
                }
            }
        })
    }

    /**
     * POST /export：将全部用户数据导出为 JSON 文件，返回文件路径
     */
    exportUsers(req, res) {
        try {
            const result = this.userService.exportUser();
            if (!result.success) return Response.err(res, 500, '用户数据导出失败');
            Response.ok(res, { filePath: result.filePath }, '用户数据导出成功');
        } catch (err) {
            this.logger.log('error', err.message);
            Response.err(res, 500, '系统内部错误');
        }

    }
}
