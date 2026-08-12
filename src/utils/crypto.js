import crypto from 'node:crypto';

export function generateMD5(data) {
    return crypto.createHash('md5').update(data).digest('base64');
};