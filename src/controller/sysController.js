import {registerController} from './routor.js';
import log from '../dao/logDao.js';
import getSysInfo from '../system/getSysInfo.js';
import Response from '../dto/response.js';

class SystemController {
    constructor() {
        this.prefix = '/api/v1/rest/system';
        this.routes = [
            {
                method:'GET',
                path:'/state',
                fn:this.getSysInfo.bind(this)
            }
        ];
    }
    getSysInfo(req,res){
        try{
            const data = getSysInfo();
            Response.ok(res,data,'获取系统状态成功');
        }catch(err){
            log('error',err.message);
            Response.err(res,500,'获取系统状态失败');
        }  
    }
}

try {
    registerController(SystemController);
} catch (err) {
    log('error', `SystemController 注册失败：${err.message}`);
}