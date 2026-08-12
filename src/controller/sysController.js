import { getSysInfo } from '../system/sysInfo.js';
import { Response } from '../dto/response.js';

export class SystemController {
    constructor(logger) {
        this.logger = logger;
        this.prefix = '/api/v1/rest/system';
        this.routes = [
            {
                method: 'GET',
                path: '/state',
                fn: this.getInfo.bind(this)
            }
        ];
    }
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