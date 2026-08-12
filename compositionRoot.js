import { createConnector } from './src/db/connector.js';
import { createLogDao } from './src/dao/logDao.js';
import { createUserDao } from './src/dao/userDao.js';
import { createUserService } from './src/service/userService.js';
import { UserController } from './src/controller/userController.js';
import { SystemController } from './src/controller/sysController.js';
import { createRoutor } from './src/controller/routor.js';
import { createMqttConnector } from './src/mqtt/connector.js';
import { createMqttService } from './src/mqtt/service.js';

export function compose() {
    try {
        const connector = createConnector();
        const db = connector.connectDB();
        const logDao = createLogDao(db);
        const userDao = createUserDao(db);
        const userService = createUserService(userDao, logDao);
        const userController = new UserController(userService, logDao);
        const systemController = new SystemController(logDao);
        const routor = createRoutor(logDao);
        routor.registerController(userController);
        routor.registerController(systemController);

        const mqttConnector = createMqttConnector(logDao);
        const mqttService = createMqttService(mqttConnector, userService, logDao);
        return {
            db,
            routor,
            mqttConnector,
            mqttService
        };
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}
