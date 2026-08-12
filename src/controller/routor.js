import http from 'node:http';
import { Response } from '../dto/response.js';

const routerMap = new Map();

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

export function createRoutor(logger) {
    function registerController(controller) {
        for (let { method, path, fn } of controller.routes) {
            registerRoute(method, controller.prefix + path, fn.bind(controller));
        }
    }

    function matchRoute(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            req.context = { url: url };
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