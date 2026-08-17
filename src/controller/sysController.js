/**
 * 系统状态控制器
 * - 提供系统运行状态查询接口（GET /api/v1/rest/system/state）
 */
import { getSysInfo } from '../system/sysInfo.js';
import { Response } from '../dto/response.js';

export class SystemController {
    /**
     * @param {object} logger 日志记录器
     */
    constructor(logger) {
        this.logger = logger;
        this.prefix = '/api/v1/rest/system'; // 路由前缀
        this.routes = [
            {
                method: 'GET',
                path: '/state',
                fn: this.getInfo.bind(this)
            }
        ];
    }

    /**
     * GET /state：获取系统运行状态并返回
     */
    getInfo(req, res) {
        try {
            const data = getSysInfo();
            Response.ok(res, data, '获取系统状态成功');
        } catch (err) {
            this.logger.log('error', err.message);
            Response.err(res, 500, '获取系统状态失败');
        }
    }
}
