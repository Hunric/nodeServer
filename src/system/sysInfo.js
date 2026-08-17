/**
 * 系统信息模块
 * - 基于 node:os 收集主机与运行环境信息
 */
import os from 'node:os';

/**
 * 获取系统运行状态信息
 * @returns {{hostname: string, platform: string, uptime: number, cpus: Array, loadavg: Array<number>, freemem: number, totalmem: number}}
 */
export function getSysInfo() {
    return {
        hostname: os.hostname(),  // 主机名
        platform: os.platform(),  // 操作系统平台
        uptime: os.uptime(),      // 系统运行时长（秒）
        cpus: os.cpus(),          // CPU 信息（型号、核心数、负载等）
        loadavg: os.loadavg(),    // 平均负载（1/5/15 分钟）
        freemem: os.freemem(),    // 可用内存（字节）
        totalmem: os.totalmem(),  // 总内存（字节）
    }
};
