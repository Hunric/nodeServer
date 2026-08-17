/**
 * 加密工具模块
 */
import crypto from 'node:crypto';

/**
 * 生成字符串的 MD5 摘要（Base64 编码）
 * @param {string} data 原始字符串
 * @returns {string} MD5 摘要（Base64）
 */
export function generateMD5(data) {
    return crypto.createHash('md5').update(data).digest('base64');
};
