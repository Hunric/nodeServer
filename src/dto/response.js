import http from 'node:http';

export class Response {
    constructor(error, data, message) {
        this.error = error;
        this.data = data;
        this.message = message;
    }
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
    static uninitialized(res) {
        return Response.err(res, 100002, '系统初始化中');
    }
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