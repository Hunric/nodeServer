/**
 * 全局配置模块
 * - 加载 .env 环境变量
 * - 提供数据库路径、MQTT 地址与端口等配置项
 */
import 'dotenv/config';

export const env = {
    DB_PATH: process.env.DB_PATH || './data/system.db',     // SQLite 数据库文件路径
    MQTT_URL: process.env.MQTT_URL || 'mqtt://localhost',   // MQTT broker 地址
    MQTT_PORT: process.env.MQTT_PORT || 1883                // MQTT broker 端口
};
