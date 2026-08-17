# basicServer

一个基于 Node.js 的轻量级后端服务骨架，同时提供 **HTTP REST 接口** 和 **MQTT 消息通道**，使用 SQLite 做数据持久化。目前实现了用户注册、用户查询、用户数据导出和系统状态获取等基础功能，适合作为物联网设备接入、简单管理后台等服务端基础。

---

## 技术栈

| 组件 | 说明 |
|---|---|
| Node.js | ESM 模块（`"type": "module"`），开发环境使用 v24 |
| HTTP | 使用 Node 内置 `node:http` + 手写路由，无 Express 依赖 |
| 数据库 | `better-sqlite3`（同步 API 的 SQLite） |
| MQTT | `mqtt` v5 客户端 |
| 配置 | `dotenv` 读取 `.env` |
| 依赖组织 | 组合根 + 工厂函数：`compositionRoot.js` 统一装配，各模块命名导出并由组合根注入依赖 |

---

## 目录结构

```
basicServer/
├── app.js                    # 入口：调用 compose() 组装依赖，启动 HTTP、连接 MQTT、注册 MQTT 服务、优雅退出
├── compositionRoot.js        # 组合根：统一创建并注入全部依赖（DB → DAO → Service → Controller / MQTT）
├── package.json
├── .env                      # 本地环境配置（不入库）
├── .env.example              # 配置示例
├── config.js                 # 环境变量读取与默认值
├── data/                     # SQLite 数据库文件（已被 gitignore）
├── exports/                  # 导出文件（如 users.json，注意含密码哈希，勿提交）
└── src/
    ├── controller/           # HTTP 路由控制器
    │   ├── routor.js         # 手写路由匹配器
    │   ├── sysController.js  # 系统状态接口
    │   └── userController.js # 用户相关接口
    ├── dao/                  # 数据访问层
    │   ├── userDao.js        # 用户表操作
    │   └── logDao.js         # 日志表操作
    ├── db/
    │   ├── connector.js      # SQLite 连接工厂（connectDB）
    │   └── schema.js         # 建表初始化
    ├── dto/response.js       # 统一 HTTP 响应格式
    ├── error/businessError.js# 业务异常类
    ├── mqtt/
    │   ├── connector.js      # MQTT 连接管理工厂：连接/订阅/发布/遗嘱/优雅断开，消息只转发原始 Buffer，不解析
    │   └── service.js        # MQTT 业务工厂：注册请求处理
    ├── service/userService.js# 用户业务逻辑
    ├── system/sysInfo.js     # 系统信息采集
    └── utils/crypto.js       # MD5 工具函数
```

---

## 架构说明

项目采用"组合根 + 工厂函数"的方式统一组织依赖：

- 所有模块一律使用**命名导出**（`export function createXxx(...)`、`export class Xxx`），不提供默认导出。
- 依赖由各模块的工厂函数创建，统一在 `compositionRoot.js` 的 `compose()` 中装配：`createConnector().connectDB()` 得到数据库实例，依次创建 DAO、Service、Controller，最后创建 MQTT Connector/Service 并注入日志等依赖。
- `app.js` 只调用 `compose()`，拿到 `{ db, routor, mqttConnector, mqttService }` 后启动 HTTP 与 MQTT，业务模块之间不直接互相 import。
- 请求链路：`HTTP 请求 / MQTT 消息 → Controller / MQTT Service → Service → DAO → SQLite`，日志统一通过注入的 `logDao` 写入 `system_logs` 表。

---

## 快速开始

### 环境要求

- Node.js ≥ 20（建议 v24，开发环境已验证）
- npm
- 如需测试 MQTT 功能，需要 MQTT Broker（如 Mosquitto）

### 安装与启动

```powershell
# 1. 安装依赖
npm install

# 2.（可选）复制并修改配置
Copy-Item .env.example .env

# 3. 启动服务
npm start
# 或
node app.js
```

启动后：

- HTTP 服务监听 `http://localhost:3000`
- MQTT 客户端连接 `mqtt://localhost:1883`
- **注意：服务启动后前 10 秒内所有 HTTP 请求会返回"系统初始化中"（`error: 100002`），请等待 10 秒后再测试**

### 验证服务已启动

```powershell
curl.exe http://localhost:3000/api/v1/rest/system/state
```

预期返回：

```json
{
  "error": 0,
  "data": {
    "hostname": "DESKTOP-XXX",
    "platform": "win32",
    "uptime": 12345,
    "cpus": [],
    "loadavg": [0, 0, 0],
    "freemem": 123456789,
    "totalmem": 123456789
  },
  "message": "获取系统状态成功"
}
```

---

## 配置说明

通过 `.env` 文件配置（支持默认值，不配置也能运行）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_PATH` | `./data/system.db` | SQLite 数据库文件路径 |
| `MQTT_URL` | `mqtt://localhost` | MQTT Broker 地址 |
| `MQTT_PORT` | `1883` | MQTT 端口 |

> ⚠️ 注意：MQTT 的用户名/密码目前硬编码在 `src/mqtt/connector.js` 中（`mqtt_user` / `mqtt_password`），尚未接入环境变量。若 Broker 开启认证，需要修改该文件。

---

## HTTP API 文档

### 统一响应格式

成功响应（HTTP 200）：

```json
{
  "error": 0,
  "data": {},
  "message": "提示信息"
}
```

错误响应：

```json
{
  "error": 400,
  "message": "错误说明"
}
```

HTTP 状态码约定：`error` 在 100~599 之间时，HTTP 状态码取该值；业务错误码（如 `100001`）不在该区间时，HTTP 状态码统一为 `422`。

---

### 1. 获取系统状态

`GET /api/v1/rest/system/state`

返回服务器主机名、平台、运行时长、CPU、内存等系统信息。

**请求示例：**

```
GET http://localhost:3000/api/v1/rest/system/state
```

**成功响应（200）：**

```json
{
  "error": 0,
  "data": {
    "hostname": "DESKTOP-XXX",
    "platform": "win32",
    "uptime": 12345,
    "cpus": [],
    "loadavg": [0, 0, 0],
    "freemem": 123456789,
    "totalmem": 123456789
  },
  "message": "获取系统状态成功"
}
```

**异常情况：**

| 场景 | HTTP 状态码 | body.error |
|---|---|---|
| 请求方法不是 GET | 404 | 404 |
| 路径不存在 | 404 | 404 |
| 服务启动前 10 秒内 | 422 | 100002 |

---

### 2. 用户注册

`POST /api/v1/rest/users/register`

注册新用户。密码会先经 MD5 处理后再入库。

**请求示例：**

```
POST http://localhost:3000/api/v1/rest/users/register
Content-Type: application/json

{
  "username": "test01",
  "password": "123456"
}
```

**成功响应（200）：**

```json
{
  "error": 0,
  "data": {
    "userId": 2
  },
  "message": "用户注册成功"
}
```

**异常情况：**

| 场景 | HTTP 状态码 | body.error | message |
|---|---|---|---|
| 缺少 `username` 或 `password`（含空字符串） | 400 | 400 | `缺少必要参数: xxx` |
| Body 为 `null` | 400 | 400 | `请求体为空` |
| Body 为空或非法 JSON | 400 | 400 | `json 格式错误` |
| 用户名已存在 | 422 | 100001 | `该用户已存在` |
| 请求方法不是 POST | 404 | 404 | `未找到该请求路径` |

> 说明：`username` / `password` 会先转成字符串再处理；当前没有用户名格式和长度校验。

---

### 3. 查询用户信息

`GET /api/v1/rest/users?username=xxx`

按用户名查询用户（返回 `id`、`username`、`created_at`，不含密码）。

**请求示例：**

```
GET http://localhost:3000/api/v1/rest/users?username=Alice
```

**成功响应（200）：**

```json
{
  "error": 0,
  "data": {
    "id": 1,
    "username": "Alice",
    "created_at": "2026-08-07 06:41:04"
  },
  "message": "查询成功"
}
```

**异常情况：**

| 场景 | HTTP 状态码 | body.error | message |
|---|---|---|---|
| 未传 `username` 参数 | 400 | 400 | `参数 username 必须` |
| 用户不存在 | 404 | 404 | `查询的用户 xxx 不存在` |
| 请求方法不是 GET | 404 | 404 | `未找到该请求路径` |

> 说明：用户名匹配区分大小写（SQLite 默认 BINARY 排序规则），查询 `alice` 找不到 `Alice`。

---

### 4. 导出用户数据

`POST /api/v1/rest/users/export`

将所有用户导出为 JSON 文件（`./exports/users.json`），并返回文件路径。

**请求示例：**

```
POST http://localhost:3000/api/v1/rest/users/export
```

**成功响应（200）：**

```json
{
  "error": 0,
  "data": {
    "filePath": "./exports/users.json"
  },
  "message": "用户数据导出成功"
}
```

导出的 `users.json` 内容包含所有用户字段（含 `password_hash`）：

```json
[
  {
    "id": 1,
    "username": "Alice",
    "password_hash": "4QrcOUm6Wau+VuBX8g+IPg==",
    "created_at": "2026-08-07 06:41:04",
    "updated_at": "2026-08-07 06:41:04"
  }
]
```

**异常情况：**

| 场景 | HTTP 状态码 | body.error |
|---|---|---|
| 导出文件写入失败 | 500 | 500 |
| 请求方法不是 POST | 404 | 404 |

> ⚠️ 导出文件含密码哈希，请勿提交到 git 仓库。

---

## 错误码说明

| 错误码 | 含义 |
|---|---|
| `0` | 成功 |
| `400` | 请求参数缺失或格式错误 |
| `404` | 路由不存在或资源不存在 |
| `500` | 服务器内部错误 |
| `100001` | 用户名已存在 |
| `100002` | 系统初始化中（服务启动后 10 秒内） |

---

## MQTT 说明

### 连接配置

- 地址：`MQTT_URL:MQTT_PORT`（默认 `mqtt://localhost:1883`）
- Client ID：`basicServer_` + 6 位随机十六进制
- 会话：`clean: true`（每次连接全新会话，不保留离线消息）
- 自动重连：断线后每 5 秒重连一次

### 主题列表

| 主题 | 方向 | 说明 |
|---|---|---|
| `/api/v1/rest/users/register` | 订阅 | 接收注册请求（JSON） |
| `/api/v1/rest/users/register-result` | 发布 | 返回注册结果 |
| `/system/availability` | 发布 | 服务在线状态（retain），异常掉线时由遗嘱消息兜底 |

### 注册请求 / 响应示例

> 设计约定：`connector` 只负责把收到的消息原样转发给业务回调（原始 `Buffer`），不做任何格式解析；payload 解析由 `service` 层按需处理，当前注册请求采用 JSON 格式。

发布到 `/api/v1/rest/users/register`：

```json
{
  "username": "mqttuser",
  "password": "123456"
}
```

订阅 `/api/v1/rest/users/register-result` 会收到：

```json
{
  "error": 0,
  "data": {
    "userId": 3
  },
  "message": "用户注册成功"
}
```

错误响应示例：

```json
{ "error": 400, "message": "请求体不是合法的 JSON 格式" }
{ "error": 400, "message": "请求体为空" }
{ "error": 400, "message": "缺少必要参数: username, password" }
{ "error": 100001, "message": "该用户已存在" }
```

> 说明：错误码语义：`400` 表示客户端问题（非法 JSON、空请求体、缺字段），`500` 表示服务器内部错误。

### 在线状态与遗嘱

- 连接成功：发布 `{"online": true}` 到 `/system/availability`（retain）
- 正常断开（调用 `disConnectMQTT`）：先发布 `{"online": false}`（retain），再断开连接
- 异常掉线：Broker 根据遗嘱消息发布 `{"online": false}`（retain）

### 订阅服务质量

- 注册请求订阅使用 QoS 2（恰好一次投递），注册结果发布同样使用 QoS 2；在线状态发布（含遗嘱）为 QoS 2 + retain。
- 注意：MQTT 有效投递级别取发布端与订阅端的较小值，若发布端以 QoS 0 发布，实际仍按 QoS 0 处理。
- `clean: true` 意味着断线重连期间的消息不会补投（会话不持久化）。若业务需要"断线不丢消息"，需改为固定 clientId + `clean: false` + 订阅 QoS 1/2。

---

## 数据库说明

数据库文件默认位于 `./data/system.db`，启动时自动建表。

### users（用户表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | 用户 ID |
| `username` | TEXT UNIQUE NOT NULL | 用户名（唯一） |
| `password_hash` | TEXT NOT NULL | 密码哈希（当前为 MD5 base64） |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间（当前无自动更新逻辑） |

### system_logs（日志表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | 日志 ID |
| `level` | TEXT | 日志级别（info / error） |
| `message` | TEXT | 日志内容 |
| `timestamp` | DATETIME | 记录时间 |

---

## 优雅退出

服务监听了 `SIGINT`（Ctrl+C）和 `SIGTERM`，收到信号后按以下顺序清理：

1. 停止接收新 HTTP 请求：调用 `server.close()`，并 `closeAllConnections()` 关闭所有连接（含空闲 keep-alive）
2. MQTT 发布 `{"online": false}` 并断开连接（等待离线消息发送完成）
3. 关闭数据库
4. 正常退出（退出码 0）

兜底机制：

- 5 秒内未完成清理则强制退出（退出码 1）
- 第二次收到信号（如再按一次 Ctrl+C）立即强制退出
- MQTT 断开有 3 秒强制兜底，避免连接异常时挂死

---

## 测试

### Postman 集合

已生成完整的 Postman 测试集合（含 30 个用例和响应断言）：

`C:\Users\coolkit\Downloads\basicServer-http-tests.postman_collection.json`

使用方法：Postman → Import → 选择该文件 → 按文件夹顺序运行。断言会自动校验 HTTP 状态码、`error` 字段、`message` 和 `data` 内容。

### HTTP 接口手动测试（curl）

```powershell
# 系统状态
curl.exe http://localhost:3000/api/v1/rest/system/state

# 注册用户
Invoke-RestMethod -Uri http://localhost:3000/api/v1/rest/users/register -Method Post -ContentType 'application/json' -Body '{"username":"test01","password":"123456"}'

# 查询用户
curl.exe "http://localhost:3000/api/v1/rest/users?username=test01"

# 导出用户
curl.exe -X POST http://localhost:3000/api/v1/rest/users/export
```

> PowerShell 中请使用 `curl.exe`，不要用 `curl`（它是 Invoke-WebRequest 的别名）。注意：Windows PowerShell 5.1 向外部程序传含双引号的参数时会剥离引号，因此带 JSON 请求体的示例使用 `Invoke-RestMethod`；在 PowerShell 7+ 中可直接用 `curl.exe -d '{"username":"test01","password":"123456"}'`。

### MQTT 测试（mosquitto）

需要先启动 Broker：

```powershell
mosquitto -v
```

订阅注册结果：

```powershell
mosquitto_sub -h localhost -t "/api/v1/rest/users/register-result" -v
```

发布注册请求（用 `-f` 从文件读取消息，避免 PowerShell 5.1 引号被剥离）：

```powershell
Set-Content -Path mqtt_register.json -Value '{"username":"mqttuser","password":"123456"}' -Encoding ascii
mosquitto_pub -h localhost -t "/api/v1/rest/users/register" -f mqtt_register.json
```

查看在线状态：

```powershell
mosquitto_sub -h localhost -t "/system/availability" -v
```

### 优雅退出验证

启动服务后按 Ctrl+C，观察输出顺序：停止接收请求 → MQTT 发布离线状态并断开 → 关闭数据库 → 正常退出；同时可用 `mosquitto_sub` 确认先收到 `{"online": false}`。

---

## 已知限制与注意事项

- **密码安全**：当前使用无盐 MD5 存储密码，仅适合演示；生产环境建议改用 `crypto.scrypt` 或 bcrypt 并加盐。
- **无鉴权**：所有 HTTP 接口均未做登录/认证，用户查询、导出等接口可直接访问。
- **MQTT 凭据硬编码**：用户名密码写在 `src/mqtt/connector.js` 中，未通过环境变量配置。
- **`exports/users.json` 含密码哈希**：该文件已在 git 历史中，注意不要提交/推送更新后的导出文件。
- **端口与初始化延迟硬编码**：HTTP 端口固定为 3000，服务启动后需等待 10 秒才响应正常请求（期间返回"系统初始化中"）。
- **注册结果主题是共享的**：所有 MQTT 客户端订阅同一个 `register-result` 主题，无法区分响应归属；如需区分，应在请求中携带 `requestId` 或使用按客户端隔离的响应主题。
- **订阅为 QoS 0**：断线期间消息不补投。
- **请求体大小无限制**：注册接口未限制请求体大小，也未监听请求流错误事件，超大请求可能占用大量内存。
- **路由为精确匹配**：路径区分大小写且不处理尾斜杠，`/api/v1/rest/users/` 与 `/api/v1/rest/users` 是两个不同路由。
