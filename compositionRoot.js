/**
 * 组合根（依赖注入组装入口）
 * - 按依赖顺序创建数据库、DAO、Service、Controller 等实例
 * - 将各层实例装配为可直接对外提供服务的完整应用
 */
import { createConnector } from './src/db/connector.js';
import { createLogDao } from './src/dao/logDao.js';
import { createUserDao } from './src/dao/userDao.js';
import { createUserService } from './src/service/userService.js';
import { UserController } from './src/controller/userController.js';
import { SystemController } from './src/controller/sysController.js';
import { createRoutor } from './src/controller/routor.js';
import { createMqttConnector } from './src/mqtt/connector.js';
import { createMqttService } from './src/mqtt/service.js';

/**
 * 组装并返回应用所需的全部实例
 * @returns {{db: object, routor: object, mqttConnector: object, mqttService: object}}
 */
export function compose() {
    try {
        // 数据库层：建立连接并初始化表结构
        const connector = createConnector();
        const db = connector.connectDB();

        // 数据访问层（DAO）
        const logDao = createLogDao(db);
        const userDao = createUserDao(db);

        // 业务逻辑层（Service）
        const userService = createUserService(userDao, logDao);

        // 控制层（Controller）
        const userController = new UserController(userService, logDao);
        const systemController = new SystemController(logDao);

        // 路由注册：将各控制器声明的路由挂载到路由表
        const routor = createRoutor(logDao);
        routor.registerController(userController);
        routor.registerController(systemController);

        // MQTT 连接与服务
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
        throw err; // 组装失败向上抛出，由入口终止启动
    }
}
