import { env } from '../config/index.js';
import mqtt from 'mqtt';
import log from '../dao/logDao.js';

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
let isConnected = false;
const dispenser = new Map();
const tiggers = [];

function connectMQTT() {
    if (mqttClient) {
        return;
    }
    mqttClient = mqtt.connect(`${URL}:${PORT}`, options);

    mqttClient.on('connect', () => {
        isConnected = true;
        mqttClient.publish('/system/availability', JSON.stringify({
            online: true,
        }), { retain: true });
        tigger();
        mqttClient.subscribe(Array.from(dispenser.keys()));
    });
    mqttClient.on('message', (topic, payload) => {
        try{
            const data = JSON.parse(payload.toString());
            if(dispenser.has(topic)){
                dispenser.get(topic)
            }
        }catch(err){
            log('error',err.message);
        }
    });
    mqttClient.on('error', (err) => {
        log('error', err.message);
        isConnected = false;
    });
    mqttClient.on('close', () => {
        log('info', 'MQTT连接关闭');
        isConnected = false;
    });
    mqttClient.on('offline', () => {
        log('info', 'MQTT服务下线');
        isConnected = false;
    });
}

function tigger() {
    for (let pub of tiggers) {
        mqttClient.publish(pub.topic, pub.payload, pub.options);
    }
    tiggers.length = 0;
}

function dispenser(fns,payload){
    for(let fn of fns){
        fn(payload);
    }
}

export { connectMQTT };