#!/usr/bin/env node

/**
 * 模拟客户端脚本
 * 功能：
 * 1. 通过WebSocket连接到后端
 * 2. 注册为客户端
 * 3. 定期上传截图（使用1.jpg）
 * 4. 发送心跳包
 */

const io = require('socket.io-client');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 配置（支持环境变量覆盖，便于并发多实例）
const CONFIG = {
  // 后端服务地址
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001/api',
  WS_URL: process.env.WS_URL || 'http://localhost:3005/monitor',

  // 客户端信息
  CLIENT_ID: null, // 将由后端生成
  CLIENT_NUMBER: process.env.CLIENT_NUMBER || `SIM-${Date.now()}`,
  CLIENT_NAME: process.env.CLIENT_NAME || '模拟客户端',
  COMPUTER_NAME: process.env.COMPUTER_NAME || 'SIMULATOR-PC',
  USERNAME: process.env.USERNAME || 'simulator',
  IP_ADDRESS: process.env.IP_ADDRESS || '127.0.0.1',
  MAC_ADDRESS: process.env.MAC_ADDRESS || '00:11:22:33:44:55',
  OS_VERSION: process.env.OS_VERSION || 'Windows 11 Pro',
  CLIENT_VERSION: process.env.CLIENT_VERSION || '1.0.0',
  SCREEN_RESOLUTION: process.env.SCREEN_RESOLUTION || '1920x1080',

  // 截图文件路径
  SCREENSHOT_PATH: process.env.SCREENSHOT_PATH || './1.jpg',

  // 时间间隔（毫秒）
  HEARTBEAT_INTERVAL: Number(process.env.HEARTBEAT_INTERVAL || 30000),  // 30秒心跳
  SCREENSHOT_INTERVAL: Number(process.env.SCREENSHOT_INTERVAL || 15000), // 15秒截图
  WHITELIST_SYNC_INTERVAL: Number(process.env.WHITELIST_SYNC_INTERVAL || 300000), // 5分钟同步白名单

  // 模拟剪贴板内容（包含区块链地址以触发安全检测）
  CLIPBOARD_CONTENTS: process.env.CLIPBOARD_CONTENTS ? JSON.parse(process.env.CLIPBOARD_CONTENTS) : [
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    'TRX: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    '普通文本内容，没有区块链地址',
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ]
};

class SimulatedClient {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.socket = null;
    this.isConnected = false;
    this.heartbeatTimer = null;
    this.screenshotTimer = null;
    this.whitelistSyncTimer = null;
    this.clipboardIndex = 0;
    this.whitelistAddresses = new Set(); // 白名单地址缓存
    this.lastWhitelistUpdate = null;
    this.clientConfig = null; // 动态配置缓存

    console.log(`🤖 模拟客户端初始化`);
    console.log(`📋 客户端编号: ${this.config.CLIENT_NUMBER}`);
  }

  // 启动模拟客户端
  async start() {
    try {
      console.log(`🚀 启动模拟客户端...`);

      // 1. 注册客户端到数据库
      await this.registerClient();

      // 2. 连接WebSocket
      await this.connectWebSocket();

      // 3. 同步白名单
      await this.syncWhitelist();

      // 4. 请求客户端配置（如果WebSocket已连接）
      if (this.isConnected) {
        this.requestConfigViaWebSocket();
        // 等待一下让配置加载
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 5. 开始定时任务（如果配置允许）
      if (!this.clientConfig || this.clientConfig.isActive !== false) {
        this.startHeartbeat();
        this.startScreenshotUpload();
        this.startWhitelistSync();
      } else {
        console.log(`⚙️ 客户端配置已禁用，跳过定时任务启动`);
      }

      console.log(`✅ 模拟客户端启动成功！`);

    } catch (error) {
      console.error(`❌ 启动失败:`, error.message);
      process.exit(1);
    }
  }

  // 注册客户端到数据库
  async registerClient() {
    console.log(`📝 注册客户端到数据库...`);

    try {
      const response = await axios.post(`${this.config.API_BASE_URL}/clients`, {
        clientNumber: this.config.CLIENT_NUMBER,
        clientName: this.config.CLIENT_NAME,
        computerName: this.config.COMPUTER_NAME,
        os: this.config.OS_VERSION,
        version: this.config.CLIENT_VERSION,
        remark: `模拟客户端 - ${this.config.USERNAME}@${this.config.IP_ADDRESS}`
      });

      // 获取后端生成的客户端ID
      this.config.CLIENT_ID = response.data.data.id;
      console.log(`✅ 客户端注册成功:`, response.data.message);
      console.log(`📋 客户端ID: ${this.config.CLIENT_ID}`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ 客户端已存在，跳过注册`);
      } else {
        throw new Error(`注册客户端失败: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  // 连接WebSocket
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 连接WebSocket: ${this.config.WS_URL}`);

      this.socket = io(this.config.WS_URL, {
        transports: ['websocket'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log(`✅ WebSocket连接成功: ${this.socket.id}`);
        this.isConnected = true;

        // 加入客户端房间
        this.socket.emit('join-client-room', { clientId: this.config.CLIENT_ID });
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log(`❌ WebSocket连接断开`);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error(`❌ WebSocket连接错误:`, error.message);
        reject(error);
      });

      this.socket.on('room-joined', (data) => {
        console.log(`🏠 加入房间成功:`, data.room);
        
        // 加入房间后主动请求白名单和配置
        this.requestWhitelistViaWebSocket();
        this.requestConfigViaWebSocket();
      });

      // 监听服务器消息
      this.socket.on('screenshot-request', () => {
        console.log(`📸 收到截图请求`);
        this.uploadScreenshot();
      });
      
      // 监听白名单更新事件
      this.socket.on('whitelist-updated', (data) => {
        console.log(`📋 收到白名单更新:`, {
          action: data.action,
          addressCount: data.addresses?.length || 0,
          lastUpdated: data.lastUpdated
        });
        
        // 更新本地白名单缓存
        this.updateLocalWhitelist(data.addresses, data.lastUpdated);
      });
      
      // 监听白名单响应事件
      this.socket.on('whitelist-response', (data) => {
        console.log(`📋 收到白名单响应: ${data.addresses?.length || 0} 个地址`);
        
        // 更新本地白名单缓存
        this.updateLocalWhitelist(data.addresses, data.lastUpdated);
      });
      
      // 监听白名单错误事件
      this.socket.on('whitelist-error', (data) => {
        console.error(`❌ 白名单请求错误:`, data.message);
      });
      
      // 监听配置响应事件
      this.socket.on('config-response', (data) => {
        console.log(`⚙️ 收到配置响应:`, {
          screenshotInterval: data.config?.screenshotInterval,
          heartbeatInterval: data.config?.heartbeatInterval,
          isActive: data.config?.isActive
        });
        
        // 更新本地配置并重启定时器
        this.updateClientConfig(data.config);
      });
      
      // 监听配置更新事件
      this.socket.on('config-updated', (data) => {
        console.log(`⚙️ 收到配置更新:`, {
          screenshotInterval: data.config?.screenshotInterval,
          heartbeatInterval: data.config?.heartbeatInterval,
          isActive: data.config?.isActive
        });
        
        // 更新本地配置并重启定时器
        this.updateClientConfig(data.config);
      });
      
      // 监听配置错误事件
      this.socket.on('config-error', (data) => {
        console.error(`❌ 配置请求错误:`, data.message);
      });
    });
  }

  // 开始心跳
  startHeartbeat() {
    console.log(`❤️ 开始心跳 (间隔: ${this.config.HEARTBEAT_INTERVAL}ms)`);

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('client-heartbeat', {
          clientId: this.config.CLIENT_ID,
          status: 'online',
          ip: this.config.IP_ADDRESS,
          timestamp: new Date()
        });
        console.log(`❤️ 发送心跳`);
      }
    }, this.config.HEARTBEAT_INTERVAL);
  }

  // 开始截图上传
  startScreenshotUpload() {
    console.log(`📸 开始截图上传 (间隔: ${this.config.SCREENSHOT_INTERVAL}ms)`);

    // 立即上传一次
    setTimeout(() => this.uploadScreenshot(), 2000);

    this.screenshotTimer = setInterval(() => {
      this.uploadScreenshot();
    }, this.config.SCREENSHOT_INTERVAL);
  }

  // 开始白名单同步
  startWhitelistSync() {
    console.log(`🔄 开始白名单同步 (间隔: ${this.config.WHITELIST_SYNC_INTERVAL}ms)`);

    this.whitelistSyncTimer = setInterval(() => {
      this.syncWhitelist();
    }, this.config.WHITELIST_SYNC_INTERVAL);
  }

  // 同步白名单（HTTP方式）
  async syncWhitelist() {
    try {
      console.log(`🔄 同步白名单 (HTTP)...`);

      const response = await axios.get(`${this.config.API_BASE_URL}/whitelist/addresses/active`);
      const { addresses, lastUpdated } = response.data.data;

      // 更新本地白名单缓存
      this.updateLocalWhitelist(addresses, lastUpdated);

      console.log(`✅ 白名单同步成功: ${addresses.length} 个地址`);
    } catch (error) {
      console.error(`❌ 白名单同步失败:`, error.response?.data?.message || error.message);
      
      // HTTP失败时尝试WebSocket请求
      if (this.isConnected) {
        console.log(`🔄 尝试通过WebSocket请求白名单...`);
        this.requestWhitelistViaWebSocket();
      }
    }
  }
  
  // 通过WebSocket请求白名单
  requestWhitelistViaWebSocket() {
    if (this.isConnected && this.socket) {
      console.log(`📡 通过WebSocket请求白名单...`);
      this.socket.emit('request-whitelist', {
        clientId: this.config.CLIENT_ID,
        timestamp: new Date()
      });
    } else {
      console.warn(`⚠️ WebSocket未连接，无法请求白名单`);
    }
  }
  
  // 通过WebSocket请求配置
  requestConfigViaWebSocket() {
    if (this.isConnected && this.socket) {
      console.log(`⚙️ 通过WebSocket请求配置...`);
      this.socket.emit('request-config', {
        clientId: this.config.CLIENT_ID
      });
    } else {
      console.warn(`⚠️ WebSocket未连接，无法请求配置`);
    }
  }

  // 更新客户端配置
  updateClientConfig(config) {
    if (!config) {
      console.log(`⚙️ 配置为空，使用默认配置`);
      return;
    }

    console.log(`⚙️ 更新客户端配置:`, {
      old: {
        screenshotInterval: this.config.SCREENSHOT_INTERVAL,
        heartbeatInterval: this.config.HEARTBEAT_INTERVAL,
        whitelistSyncInterval: this.config.WHITELIST_SYNC_INTERVAL
      },
      new: {
        screenshotInterval: config.screenshotInterval * 1000,
        heartbeatInterval: config.heartbeatInterval * 1000,
        whitelistSyncInterval: config.whitelistSyncInterval * 1000
      }
    });

    // 缓存配置
    this.clientConfig = config;

    // 如果配置被禁用，停止所有定时器
    if (!config.isActive) {
      console.log(`⚙️ 配置已禁用，停止所有定时器`);
      this.stopTimers();
      return;
    }

    // 更新配置值（转换为毫秒）
    const oldScreenshotInterval = this.config.SCREENSHOT_INTERVAL;
    const oldHeartbeatInterval = this.config.HEARTBEAT_INTERVAL;
    const oldWhitelistSyncInterval = this.config.WHITELIST_SYNC_INTERVAL;

    this.config.SCREENSHOT_INTERVAL = config.screenshotInterval * 1000;
    this.config.HEARTBEAT_INTERVAL = config.heartbeatInterval * 1000;
    this.config.WHITELIST_SYNC_INTERVAL = config.whitelistSyncInterval * 1000;

    // 重启定时器（如果间隔发生变化）
    if (oldScreenshotInterval !== this.config.SCREENSHOT_INTERVAL) {
      console.log(`⚙️ 重启截图定时器: ${oldScreenshotInterval}ms -> ${this.config.SCREENSHOT_INTERVAL}ms`);
      this.restartScreenshotTimer();
    }

    if (oldHeartbeatInterval !== this.config.HEARTBEAT_INTERVAL) {
      console.log(`⚙️ 重启心跳定时器: ${oldHeartbeatInterval}ms -> ${this.config.HEARTBEAT_INTERVAL}ms`);
      this.restartHeartbeatTimer();
    }

    if (oldWhitelistSyncInterval !== this.config.WHITELIST_SYNC_INTERVAL) {
      console.log(`⚙️ 重启白名单同步定时器: ${oldWhitelistSyncInterval}ms -> ${this.config.WHITELIST_SYNC_INTERVAL}ms`);
      this.restartWhitelistSyncTimer();
    }
  }
  
  // 更新本地白名单缓存
  updateLocalWhitelist(addresses, lastUpdated) {
    if (!addresses || !Array.isArray(addresses)) {
      console.warn(`⚠️ 无效的白名单数据`);
      return;
    }
    
    this.whitelistAddresses.clear();
    addresses.forEach(addr => {
      if (typeof addr === 'string') {
        this.whitelistAddresses.add(addr.toLowerCase());
      }
    });
    
    this.lastWhitelistUpdate = lastUpdated ? new Date(lastUpdated) : new Date();
    
    console.log(`💾 本地白名单缓存已更新: ${this.whitelistAddresses.size} 个地址`);
  }

  // 上传截图（带重试机制）
  async uploadScreenshot(retryCount = 0) {
    const maxRetries = 2;

    try {
      console.log(`📸 上传截图...${retryCount > 0 ? ` (重试 ${retryCount}/${maxRetries})` : ''}`);

      // 检查截图文件是否存在
      if (!fs.existsSync(this.config.SCREENSHOT_PATH)) {
        throw new Error(`截图文件不存在: ${this.config.SCREENSHOT_PATH}`);
      }

      // 创建FormData
      const formData = new FormData();
      formData.append('clientId', this.config.CLIENT_ID);

      // 循环使用不同的剪贴板内容
      const clipboardContent = this.config.CLIPBOARD_CONTENTS[this.clipboardIndex % this.config.CLIPBOARD_CONTENTS.length];
      this.clipboardIndex++;

      // 客户端本地违规检测
      const violationResult = this.detectViolation(clipboardContent);
      if (violationResult.hasViolation) {
        console.log(`🚨 检测到违规内容: ${violationResult.violationType} - ${violationResult.content}`);

        // 先上报违规，再上传截图
        await this.reportViolation(violationResult, clipboardContent);
      }

      formData.append('clipboardContent', clipboardContent);

      // 读取文件内容（避免流的并发问题）
      const fileBuffer = fs.readFileSync(this.config.SCREENSHOT_PATH);
      formData.append('file', fileBuffer, {
        filename: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        contentType: 'image/jpeg'
      });

      // 上传到后端
      const response = await axios.post(
        `${this.config.API_BASE_URL}/security/screenshots/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log(`✅ 截图上传成功:`, {
        url: response.data?.data?.url,
        path: response.data?.data?.path,
        size: response.data?.data?.size,
        clipboardContent: clipboardContent.substring(0, 50) + (clipboardContent.length > 50 ? '...' : '')
      });

      // 通过WebSocket通知截图更新
      if (this.isConnected) {
        this.socket.emit('screenshot-uploaded', {
          clientId: this.config.CLIENT_ID,
          screenshotUrl: (response.data?.data?.url || response.data?.data?.path),
          timestamp: new Date()
        });
      }

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`❌ 截图上传失败:`, errorMsg);

      // 重试机制
      if (retryCount < maxRetries && !error.response?.status === 400) {
        console.log(`🔄 ${Math.floor(Math.random() * 3 + 2)}秒后重试...`);
        setTimeout(() => {
          this.uploadScreenshot(retryCount + 1);
        }, Math.floor(Math.random() * 3000 + 2000)); // 2-5秒随机延迟
      }
    }
  }

  // 本地违规检测
  detectViolation(content) {
    if (!content || typeof content !== 'string') {
      return { hasViolation: false };
    }

    // 区块链地址检测正则表达式
    const blockchainPatterns = {
      BITCOIN: /\b[13][a-km-z1-9A-HJ-NP-Z]{25,34}\b|bc1[a-z0-9]{39,59}/gi,
      ETHEREUM: /\b0x[a-fA-F0-9]{40}\b/g,
      TRON: /\bT[A-Za-z1-9]{33}\b/g,
      LITECOIN: /\b[LM3][a-km-z1-9A-HJ-NP-Z]{26,33}\b/g,
      DOGECOIN: /\bD{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b/g,
    };

    // 检测各种区块链地址
    for (const [type, pattern] of Object.entries(blockchainPatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // 检查是否在白名单中
          if (!this.whitelistAddresses.has(match.toLowerCase())) {
            return {
              hasViolation: true,
              violationType: 'BLOCKCHAIN_ADDRESS',
              content: match,
              blockchainType: type,
              fullContent: content
            };
          }
        }
      }
    }

    return { hasViolation: false };
  }

  // 上报违规事件
  async reportViolation(violationResult, fullContent) {
    try {
      console.log(`📤 上报违规事件...`);

      const reportData = {
        clientId: this.config.CLIENT_ID,
        violationType: violationResult.violationType,
        violationContent: violationResult.content,
        additionalData: {
          blockchainType: violationResult.blockchainType,
          fullClipboardContent: fullContent,
          detectionTime: new Date(),
          whitelistSize: this.whitelistAddresses.size,
          lastWhitelistUpdate: this.lastWhitelistUpdate
        }
      };

      const response = await axios.post(
        `${this.config.API_BASE_URL}/security/violations/report`,
        reportData,
        { timeout: 10000 }
      );

      console.log(`✅ 违规上报成功:`, {
        alertId: response.data.data.alertId,
        violationType: violationResult.violationType,
        content: violationResult.content.substring(0, 20) + '...'
      });

    } catch (error) {
      console.error(`❌ 违规上报失败:`, error.response?.data?.message || error.message);
    }
  }

  // 停止所有定时器
  stopTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
      this.screenshotTimer = null;
    }

    if (this.whitelistSyncTimer) {
      clearInterval(this.whitelistSyncTimer);
      this.whitelistSyncTimer = null;
    }
  }

  // 重启心跳定时器
  restartHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.startHeartbeat();
  }

  // 重启截图定时器
  restartScreenshotTimer() {
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
    }
    this.startScreenshotUpload();
  }

  // 重启白名单同步定时器
  restartWhitelistSyncTimer() {
    if (this.whitelistSyncTimer) {
      clearInterval(this.whitelistSyncTimer);
    }
    this.startWhitelistSync();
  }

  // 停止模拟客户端
  stop() {
    console.log(`🛑 停止模拟客户端...`);

    // 清除定时器
    this.stopTimers();

    // 断开WebSocket连接
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    console.log(`✅ 模拟客户端已停止`);
  }
}


// 批量并发模拟多个客户端（默认20个）
async function runMany(count = 20, staggerMs = 200) {
  console.log(`🚀 启动并发模拟：${count} 个客户端`)
  const clients = []

  const startTs = Date.now()
  for (let i = 0; i < count; i++) {
    const suffix = String(i + 1).padStart(2, '0')
    const c = new SimulatedClient({
      CLIENT_NUMBER: `SIM-${startTs}-${suffix}`,
      COMPUTER_NAME: `SIM-PC-${suffix}`,
      MAC_ADDRESS: `00:11:22:33:44:${suffix}`,
    })

    // 以微小错峰启动，减少瞬时压力
    await new Promise(r => setTimeout(r, staggerMs))
    c.start().catch(err => console.error(`客户端 ${suffix} 启动失败:`, err?.message || err))
    clients.push(c)
  }

  // 退出信号处理
  process.on('SIGINT', () => {
    console.log(`\n🛑 收到退出信号，正在停止所有模拟客户端...`)
    clients.forEach(c => c.stop())
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    console.log(`\n🛑 收到终止信号，正在停止所有模拟客户端...`)
    clients.forEach(c => c.stop())
    process.exit(0)
  })
}

// 主函数
async function main() {
  console.log(`🎯 屏幕监控系统 - 模拟客户端`);
  console.log(`📅 启动时间: ${new Date().toLocaleString()}`);
  console.log(`─────────────────────────────────────`);

  const client = new SimulatedClient();

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log(`\n📋 收到退出信号...`);
    client.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(`\n📋 收到终止信号...`);
    client.stop();
    process.exit(0);
  });

  // 若设置了并发数量，则并发启动
  const concurrent = Number(process.env.CLIENT_COUNT || 0)
  if (concurrent && concurrent > 1) {
    await runMany(concurrent, Number(process.env.CLIENT_STAGGER_MS || 200))
    return
  }

  // 启动单个客户端
  await client.start();
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error(`💥 程序异常:`, error);
    process.exit(1);
  });
}

module.exports = SimulatedClient;
