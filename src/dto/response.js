/**
 * HTTP 响应封装（DTO）
 * - 统一成功 / 失败响应的 JSON 结构与 HTTP 状态码
 */
import http from 'node:http';

export class Response {
    constructor(error, data, message) {
        this.error = error;
        this.data = data;
        this.message = message;
    }

    /**
     * 成功响应：HTTP 200，响应体为 { error: 0, data, message }
     * @param {http.ServerResponse} res
     * @param {*} data 业务数据
     * @param {string} message 提示信息
     */
    static ok(res, data, message) {
        res.statusCode = 200;
        res.statusMessage = http.STATUS_CODES[200];
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 0,
            data: data,
            message: message
        }), 'utf-8');
    }

    /**
     * 系统未初始化完成时的统一响应（业务码 100002）
     */
    static uninitialized(res) {
        return Response.err(res, 100002, '系统初始化中');
    }

    /**
     * 失败响应：HTTP 状态码取业务码（限 100-599），范围外兜底为 422
     * 响应体为 { error: 业务码, message }
     * @param {http.ServerResponse} res
     * @param {number} code 业务错误码
     * @param {string} message 错误描述
     */
    static err(res, code, message) {
        res.statusCode = code>=100&&code<=599?code:422;
        res.statusMessage = http.STATUS_CODES[res.statusCode] || '';
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: code,
            message: message
        }), 'utf-8');
    }
};
