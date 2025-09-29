import { Platform } from 'react-native';

// API基础配置
const API_CONFIG = {
  // 根据平台设置不同的API地址
  BASE_URL: Platform.OS === 'web' 
    ? 'http://192.168.1.6:3000'  // Web浏览器（手机和电脑）
    : 'http://192.168.1.6:3000', // 真机测试使用电脑IP
  
  // Android模拟器使用: http://10.0.2.2:3000
  // iOS模拟器使用: http://localhost:3000
  // 真机使用: http://192.168.1.6:3000
  
  TIMEOUT: 10000, // 请求超时时间（毫秒）
  VERSION: 'v1',  // API版本
};

// 强制日志，确保配置被正确读取
console.log('🔧 API配置加载:');
console.log('- Platform.OS:', Platform.OS);
console.log('- API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
console.log('- API配置已更新为电脑IP 192.168.1.6');

// 完整的API地址
const API_BASE = `${API_CONFIG.BASE_URL}/api`;

// API接口地址配置
export const API_ENDPOINTS = {
  // 用户相关
  USER: {
    REGISTER: `${API_BASE}/users/register`,
    GET_USER: (userId) => `${API_BASE}/users/${userId}`,
    GET_MESSAGES: (userId) => `${API_BASE}/users/${userId}/messages`,
    GET_BOTTLES: (userId) => `${API_BASE}/users/${userId}/bottles`,
  },
  
  // 瓶子相关
  BOTTLE: {
    CREATE: `${API_BASE}/bottles`,
    PICK_LIST: `${API_BASE}/bottles/pick`,
    PICK_ONE: (bottleId) => `${API_BASE}/bottles/${bottleId}/pick`,
  },
  
  // 消息相关
  MESSAGE: {
    CREATE: `${API_BASE}/messages`,
    MARK_READ: (messageId) => `${API_BASE}/messages/${messageId}/read`,
  },
  
  // 系统相关
  SYSTEM: {
    HEALTH: `${API_CONFIG.BASE_URL}/`,
  }
};

// HTTP请求封装
class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    try {
      console.log(`API请求: ${config.method} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`API响应: ${url}`, data);
      
      return data;
    } catch (error) {
      console.error(`API错误: ${url}`, error);
      throw error;
    }
  }

  // GET请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, { method: 'GET' });
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

// 具体的API方法
export const ApiService = {
  // 用户相关API
  user: {
    // 检查用户名是否存在
    checkUsername: (username) => apiClient.get(`/users/check-username/${username}`),
    
    // 创建用户
    create: (userData) => apiClient.post('/users', userData),
    
    // 获取用户信息
    getUser: (userId) => apiClient.get(`/users/${userId}`),
    
    // 获取所有用户
    getAll: () => apiClient.get('/users'),
    
    // 获取用户消息
    getMessages: (userId) => apiClient.get(`/users/${userId}/messages`),
    
    // 获取用户瓶子
    getBottles: (userId) => apiClient.get(`/users/${userId}/bottles`),
  },

  // 瓶子相关API
  bottle: {
    // 扔瓶子
    create: (bottleData) => apiClient.post('/bottles', bottleData),
    
    // 获取所有瓶子
    getAll: () => apiClient.get('/bottles'),
    
    // 获取可捡的瓶子列表
    getPickable: (latitude, longitude) => 
      apiClient.get('/bottles/pick', { latitude, longitude }),
    
    // 捡瓶子
    pick: (bottleId, pickerId) => 
      apiClient.post(`/bottles/${bottleId}/pick`, { pickerId }),
  },

  // 消息相关API
  message: {
    // 发送消息
    send: (messageData) => apiClient.post('/messages', messageData),
    
    // 获取所有消息
    getAll: () => apiClient.get('/messages'),
    
    // 标记消息为已读
    markAsRead: (messageId) => apiClient.put(`/messages/${messageId}/read`),
  },

  // 系统相关API
  system: {
    // 检查服务器状态
    health: () => apiClient.get(API_ENDPOINTS.SYSTEM.HEALTH),
  },
};

// 导出配置
export { API_CONFIG, API_BASE };
export default ApiService;
