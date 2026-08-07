import { env } from '../config/index.js';
import mqtt from 'mqtt';

const URL = env.MQTT_URL;
const PORT = env.MQTT_PORT;

const options = {
    clientId: 'basicServer_' + Math.random().toString(16).substring(2, 8),
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 5000,
    username: 'mqtt_user',
    password: 'mqtt_password',
    will: {
        topic: '/system/availability',
        payload: JSON.stringify({
            online: false,
        }),
        qos: 2,
        retain: true
    }
}

let mqttClient = null;

function connect() {
    if (mqttClient) {
        return mqttClient;
    }
    mqttClient = mqtt.connect(`${URL}:${PORT}`, options);
    return mqttClient;
}

function publishOnlineMessage() {
    mqttClient.publish('/system/availability', JSON.stringify({
        online: true,
    }),{retain:true});
}

function connectMQTT() {
    connect().on('connect', () => {
        publishOnlineMessage();
    });
}

export { connectMQTT, mqttClient };