import os from 'node:os';

export function getSysInfo() {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime(),
        cpus: os.cpus(),
        loadavg: os.loadavg(),
        freemem: os.freemem(),
        totalmem: os.totalmem(),
    }
};