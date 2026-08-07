import 'dotenv/config';

export const env = { 
    DB_PATH: process.env.DB_PATH || './data/system.db',
    MQTT_URL: process.env.MQTT_URL || 'mqtt://localhost',
    MQTT_PORT: process.env.MQTT_PORT || 1883
 };
