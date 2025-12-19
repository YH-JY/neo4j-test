# Cloud Native Graph Platform - Windows Deployment Guide

本文档说明如何在Windows上部署云原生图谱平台，K8s集群和Neo4j运行在Linux主机上。

## 前置要求

### Windows环境
1. **Node.js >= 14.x**
   - 下载地址: https://nodejs.org/
   - 建议使用LTS版本

2. **Git for Windows** (可选，用于克隆代码)
   - 下载地址: https://git-scm.com/download/win

### Linux主机环境
1. **Neo4j数据库运行中**
2. **Kubernetes集群可访问**
3. **防火墙配置正确**（允许Windows访问Linux的端口）

## 部署步骤

### 1. Linux主机配置

#### 1.1 确保Neo4j可以从外部访问
```bash
# 检查Neo4j容器配置
docker ps | grep neo4j

# 如果需要重新启动，允许外部连接
docker stop neo4j
docker run --name neo4j \
  -p 0.0.0.0:7474:7474 \
  -p 0.0.0.0:7687:7687 \
  -e NEO4J_AUTH=neo4j/neo4j@123 \
  -e NEO4J_dbms_connector_bolt_listen__address=0.0.0.0:7687 \
  -e NEO4J_dbms_connector_http_listen__address=0.0.0.0:7474 \
  -d neo4j:latest
```

#### 1.2 配置防火墙（如果需要）
```bash
# Ubuntu/Debian
sudo ufw allow 7474/tcp
sudo ufw allow 7687/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=7474/tcp
sudo firewall-cmd --permanent --add-port=7687/tcp
sudo firewall-cmd --reload
```

#### 1.3 准备Kubernetes访问凭证
```bash
# 方案1：复制kubeconfig文件
scp ~/.kube/config user@windows-machine:/path/to/save/kubeconfig

# 方案2：如果K8s有外部API端点，可以直接在Windows配置
```

### 2. Windows环境部署

#### 2.1 获取代码
```powershell
# 方案1：使用Git克隆
git clone https://github.com/YH-JY/neo4j-test.git
cd neo4j-test

# 方案2：下载ZIP文件并解压
```

#### 2.2 配置环境变量
编辑 `backend\.env` 文件：

```bash
# 替换LINUX_HOST_IP为你的Linux主机IP地址
NEO4J_URI=http://192.168.40.129:7474
NEO4J_BOLT_URL=bolt://192.168.40.129:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j@123

# Kubernetes配置
K8S_CONFIG_PATH=C:\path\to\your\kubeconfig
K8S_CLUSTER_NAME=your-cluster-name

# 服务器配置
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### 2.3 启动应用
```cmd
# 双击运行启动脚本
start-windows.bat

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

### 3. 访问应用

- **Web平台**: http://localhost:3000
- **Neo4j Browser**: http://192.168.40.129:7474
- **API文档**: http://localhost:3001/health

## 常见问题解决

### 1. 无法连接到Neo4j

**检查网络连通性：**
```cmd
# 在Windows命令行中
telnet 192.168.40.129 7474
telnet 192.168.40.129 7687
```

**解决方案：**
- 确保Linux防火墙已开放7474和7687端口
- 检查Neo4j容器是否正确绑定到0.0.0.0
- 验证Windows和Linux在同一网络或可互相访问

### 2. 无法连接到Kubernetes

**解决方案：**
```cmd
# 测试kubeconfig
kubectl --kubeconfig=C:\path\to\kubeconfig get nodes

# 如果使用云K8s服务，确保API端点可访问
curl -k https://k8s-api-endpoint:6443
```

### 3. CORS错误

如果出现跨域错误，检查后端配置：
```javascript
// backend/src/index.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

## 高级配置

### 1. 使用PowerShell脚本启动

创建 `start.ps1`：
```powershell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 启动脚本
./start.ps1
```

### 2. 使用PM2管理进程（可选）

```cmd
# 安装PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start src/index.js --name "graph-backend"

# 启动前端
cd ../frontend
pm2 start "npm start" --name "graph-frontend"
```

### 3. 配置反向代理（可选）

使用IIS或Nginx作为反向代理，可以：
- 统一端口访问
- 启用HTTPS
- 负载均衡

## 安全建议

1. **不要在生产环境中暴露Neo4j到公网**
2. **使用VPN或专线连接Windows和Linux**
3. **定期更新访问凭证**
4. **启用Windows防火墙限制入站连接**

## 性能优化

1. **Windows上安装WSL2**（Windows Subsystem for Linux）
2. **使用SSD硬盘**
3. **确保足够的内存（推荐8GB+）**
4. **关闭不必要的Windows服务**

## 故障排除工具

1. **Windows网络诊断**：
   ```cmd
   ping 192.168.40.129
   tracert 192.168.40.129
   ```

2. **端口扫描工具**：
   - 使用 `nmap` 检查端口开放情况
   - 使用 `telnet` 测试特定端口

3. **日志查看**：
   - 后端日志: `backend\logs\combined.log`
   - 错误日志: `backend\logs\error.log`
   - 浏览器开发者工具查看前端错误

## 支持和反馈

如果遇到问题，请：
1. 查看日志文件
2. 检查GitHub Issues
3. 提交新的Issue并附上错误信息和配置