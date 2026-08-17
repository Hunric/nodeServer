/**
 * 业务异常
 * - 继承 Error 并携带业务错误码，供上层根据 code 区分错误类型
 */
export class BusinessError extends Error{
    /**
     * @param {number} code 业务错误码
     * @param {string} message 错误描述
     */
    constructor(code,message){
        super(message);
        this.code = code;
        this.name = 'BusinessError';
    }
};
