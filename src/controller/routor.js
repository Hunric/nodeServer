/**
 * 路由模块
 * - 提供轻量级路由注册与匹配能力（不依赖第三方框架）
 * - 以 "METHOD pathname" 为键精确匹配请求，未命中返回 404
 */
import http from 'node:http';
import { Response } from '../dto/response.js';

// 路由表：key 为 "METHOD pathname"，value 为对应的处理函数
const routerMap = new Map();

/**
 * 注册一条路由（含参数合法性校验）
 * @param {string} method HTTP 方法（如 GET、POST）
 * @param {string} pathname 请求路径（须以 / 开头）
 * @param {Function} handler 处理函数 (req, res) => void
 */
function registerRoute(method, pathname, handler) {
    if (!method || !http.METHODS.includes(method)) {
        throw new Error('注册路由失败：Invalid method');
    }
    if (!pathname || !pathname.startsWith('/')) {
        throw new Error('注册路由失败：Invalid pathname');
    }
    if (!handler || typeof handler !== 'function') {
        throw new Error('注册路由失败：Invalid handler function');
    }
    routerMap.set(`${method} ${pathname}`, handler);
}

/**
 * 创建路由实例
 * @param {object} logger 日志记录器（含 log 方法）
 */
export function createRoutor(logger) {
    /**
     * 注册控制器：遍历控制器声明的 routes，将每条路由按前缀拼装后写入路由表
     * @param {{prefix: string, routes: Array<{method: string, path: string, fn: Function}>}} controller
     */
    function registerController(controller) {
        for (let { method, path, fn } of controller.routes) {
            registerRoute(method, controller.prefix + path, fn.bind(controller));
        }
    }

    /**
     * 匹配并分发请求
     * - 解析请求 URL，拼出 "METHOD pathname" 键查找路由
     * - 命中则调用处理函数，未命中返回 404，异常返回 500
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function matchRoute(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            req.context = { url: url }; // 解析后的 URL 挂到请求上下文，供后续处理器使用
            const route = `${req.method} ${url.pathname}`;
            if (routerMap.has(route)) {
                routerMap.get(route)(req, res);
            } else {
                Response.err(res, 404, '未找到该请求路径');
            }
        } catch (err) {
            logger.log('error', `匹配路由失败:[${err.name}] ${err.message}`);
            Response.err(res, 500, '服务器内部错误');
        }
    }

    return {
        registerController,
        matchRoute
    };
};
