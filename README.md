# Cloud Native Graph Platform

一个用于可视化云原生Kubernetes资产关系和分析攻击路径的Web平台。

## 功能特性

- 🔄 **资产自动发现**: 自动扫描K8s集群，收集Pod、Service、Deployment、Namespace等资源信息
- 🔗 **关系映射**: 自动构建K8s资源之间的关系图谱
- 📊 **可视化展示**: 交互式图谱展示云原生资产和它们之间的关系
- 🛡️ **安全分析**: 分析潜在的攻击路径和安全风险
- 🔍 **灵活查询**: 支持Cypher查询语言进行高级查询分析
- ⚡ **双协议支持**: 同时支持Neo4j REST API和Bolt协议

## 架构设计

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    Neo4j DB     │
│   (React)       │     │   (Express.js)  │     │   (图数据库)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │ Kubernetes API  │
                       │   (集群资产)     │
                       └─────────────────┘
```

## 快速开始

### 前置要求

**Linux部署（完整部署）**：
1. **Docker和Docker Compose**
2. **Node.js >= 14.x**
3. **Kubernetes集群访问权限**
4. **kubectl命令行工具**

**Windows部署（仅运行平台，K8s和Neo4j在Linux）**：
1. **Node.js >= 14.x** (https://nodejs.org/)
2. **Git for Windows** (https://git-scm.com/download/win)
3. **可访问的Linux主机**（运行K8s和Neo4j）

### 部署方式

#### 方式1：Linux完整部署
所有组件在同一台Linux主机上运行。

#### 方式2：Windows + Linux混合部署（推荐）
- Windows运行：Frontend和Backend
- Linux运行：Kubernetes集群和Neo4j数据库
- 通过网络连接

详细说明见：[WINDOWS-DEPLOYMENT.md](WINDOWS-DEPLOYMENT.md)

### 安装和运行

#### Linux系统

1. **克隆项目**
   ```bash
   git clone https://github.com/YH-JY/neo4j-test.git
   cd neo4j-test
   ```

2. **启动Neo4j数据库**
   ```bash
   # 使用Docker启动Neo4j
   docker run --name neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/neo4j@123 \
     -d neo4j:latest
   ```

3. **配置环境变量**
   ```bash
   # 复制环境配置
   cp backend/.env.example backend/.env
   
   # 编辑配置文件，更新你的K8s和Neo4j连接信息
   vim backend/.env
   ```

4. **一键启动**
   ```bash
   # 使用启动脚本（推荐）
   ./start.sh
   
   # 或手动启动
   # 后端
   cd backend
   npm install
   npm start
   
   # 前端（新终端）
   cd frontend
   npm install
   npm start
   ```

5. **访问应用**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Neo4j Browser: http://192.168.40.129:7474

#### Windows系统

1. **克隆项目**
   ```cmd
   git clone https://github.com/YH-JY/neo4j-test.git
   cd neo4j-test
   ```

2. **环境检查**
   ```cmd
   setup-windows.bat
   ```

3. **配置连接信息**
   - 编辑 `backend\.env` 文件
   - 更新Neo4j和K8s连接信息（指向Linux主机）

4. **启动应用**
   ```cmd
   start-windows.bat
   ```

5. **访问应用**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Neo4j Browser: http://192.168.40.129:7474

## 使用指南

### 1. Dashboard
- 查看系统连接状态
- 监控图谱统计信息
- 快速操作入口

### 2. Asset Collection（资产收集）
- 从K8s集群收集资源信息
- 选择导入方式（REST API或Bolt）
- 支持按命名空间过滤

### 3. Graph Visualization（图谱可视化）
- 交互式图谱展示
- 支持节点筛选
- 自定义Cypher查询
- 节点详情查看

### 4. Attack Path Analysis（攻击路径分析）
- 选择起始和目标节点
- 自动计算最短攻击路径
- 识别安全漏洞
- 生成安全报告

### 5. Query Interface（查询界面）
- Cypher查询编辑器
- 预定义查询模板
- 查询历史记录
- 语法提示助手

## API 端点

### Kubernetes
- `GET /api/k8s/assets` - 获取所有K8s资产
- `GET /api/k8s/relationships` - 获取资产关系
- `GET /api/k8s/health` - 检查K8s连接

### Neo4j
- `POST /api/neo4j/import/rest` - 通过REST API导入数据
- `POST /api/neo4j/import/bolt` - 通过Bolt协议导入数据
- `DELETE /api/neo4j/clear/rest` - 清空图谱（REST）
- `DELETE /api/neo4j/clear/bolt` - 清空图谱（Bolt）

### Graph
- `GET /api/graph/nodes` - 获取图谱节点
- `GET /api/graph/stats` - 获取图谱统计
- `POST /api/graph/query/rest` - 执行查询（REST）
- `POST /api/graph/query/bolt` - 执行查询（Bolt）
- `POST /api/graph/attack-paths/rest` - 获取攻击路径（REST）
- `POST /api/graph/attack-paths/bolt` - 获取攻击路径（Bolt）

## 安全特性

1. **默认服务账户检测**: 识别使用默认service account的Pod
2. **暴露服务识别**: 检测LoadBalancer和NodePort类型的服务
3. **RBAC权限分析**: 分析角色和集群角色权限
4. **网络暴露评估**: 识别Ingress和外部访问点
5. **攻击路径可视化**: 展示潜在的攻击链

## 配置说明

### Backend配置 (.env)
```bash
# Neo4j配置
NEO4J_URI=http://192.168.40.129:7474
NEO4J_BOLT_URL=bolt://192.168.40.129:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j@123

# Kubernetes配置
K8S_CONFIG_PATH=/path/to/kubeconfig
K8S_CLUSTER_NAME=your-cluster-name

# 服务器配置
PORT=3001
NODE_ENV=development
```

### Kubernetes访问权限
需要以下RBAC权限：
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: graph-platform-reader
rules:
- apiGroups: [""]
  resources: ["pods", "services", "namespaces", "serviceaccounts"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "clusterroles", "rolebindings", "clusterrolebindings"]
  verbs: ["get", "list"]
```

## 故障排除

### 常见问题

1. **无法连接到K8s集群**
   - 检查kubeconfig文件是否正确
   - 确认kubectl可以正常访问集群
   - 验证RBAC权限是否足够

2. **Neo4j连接失败**
   - 检查Neo4j容器是否运行
   - 验证连接URL和认证信息
   - 确认防火墙设置

3. **前端无法访问后端**
   - 检查后端是否正常运行
   - 验证端口配置
   - 查看CORS设置

### 日志查看
- Backend日志: `backend/logs/combined.log`
- 错误日志: `backend/logs/error.log`

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License