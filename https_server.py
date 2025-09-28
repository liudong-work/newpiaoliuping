#!/usr/bin/env python3
"""
HTTPS服务器，用于支持WebRTC麦克风权限
参考piaoliuping项目的实现
"""
import http.server
import ssl
import socketserver
import os
import sys
import json
import uuid
import threading
import time
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 存储房间和用户信息
rooms = {}
users = {}
messages = {}  # 存储待发送的消息

class VoiceChatHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/health':
            self.send_health_response()
        elif path == '/api/rooms':
            self.send_rooms_response()
        elif path == '/api/poll':
            self.handle_poll()
        else:
            # 处理静态文件和React Router路由
            self.handle_static_file()
    
    def do_POST(self):
        """处理POST请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/join_room':
            self.handle_join_room()
        elif path == '/api/signal':
            self.handle_signal()
        else:
            self.send_error(404, "Not Found")
    
    def send_health_response(self):
        """发送健康检查响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'status': 'ok',
            'rooms': len(rooms),
            'users': len(users),
            'timestamp': datetime.now().isoformat()
        }
        self.wfile.write(json.dumps(response).encode())
    
    def send_rooms_response(self):
        """发送房间列表响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        room_list = []
        for room_id, room in rooms.items():
            room_list.append({
                'id': room_id,
                'user_count': len(room['users']),
                'created_at': room['created_at'].isoformat()
            })
        
        self.wfile.write(json.dumps(room_list).encode())
    
    def handle_join_room(self):
        """处理加入房间请求"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            user_id = str(uuid.uuid4())
            room_id = data.get('roomId', 'default_room')
            
            # 创建或获取房间
            if room_id not in rooms:
                rooms[room_id] = {
                    'id': room_id,
                    'users': [],
                    'created_at': datetime.now()
                }
            
            # 添加用户到房间
            user_info = {
                'user_id': user_id,
                'user_data': data,
                'last_seen': datetime.now()
            }
            
            rooms[room_id]['users'].append(user_info)
            users[user_id] = {
                'room_id': room_id,
                'user_data': data,
                'last_seen': datetime.now()
            }
            
            # 初始化消息队列
            if user_id not in messages:
                messages[user_id] = []
            
            # 通知房间内其他用户
            for user in rooms[room_id]['users']:
                if user['user_id'] != user_id:
                    if user['user_id'] not in messages:
                        messages[user['user_id']] = []
                    messages[user['user_id']].append({
                        'type': 'user_joined',
                        'data': {
                            'user_id': user_id,
                            'user_data': data
                        },
                        'timestamp': datetime.now().isoformat()
                    })
            
            # 发送房间信息给新用户
            room_users = [u for u in rooms[room_id]['users'] if u['user_id'] != user_id]
            messages[user_id].append({
                'type': 'room_info',
                'data': {
                    'room_id': room_id,
                    'users': [{'user_id': u['user_id'], 'user_data': u['user_data']} for u in room_users]
                },
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"用户 {user_id} 加入房间 {room_id}")
            
            # 发送响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'user_id': user_id,
                'room_id': room_id,
                'message': '成功加入房间'
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            logger.error(f"处理加入房间请求失败: {e}")
            self.send_error(500, "Internal Server Error")
    
    def handle_signal(self):
        """处理WebRTC信令"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            user_id = data.get('user_id')
            signal_type = data.get('type')
            signal_data = data.get('data')
            
            if not user_id or not signal_type:
                self.send_error(400, "Bad Request")
                return
            
            user = users.get(user_id)
            if not user:
                self.send_error(404, "User Not Found")
                return
            
            room_id = user['room_id']
            if room_id not in rooms:
                self.send_error(404, "Room Not Found")
                return
            
            # 转发信令给房间内其他用户
            for room_user in rooms[room_id]['users']:
                if room_user['user_id'] != user_id:
                    if room_user['user_id'] not in messages:
                        messages[room_user['user_id']] = []
                    messages[room_user['user_id']].append({
                        'type': signal_type,
                        'data': {
                            'from': user_id,
                            'data': signal_data
                        },
                        'timestamp': datetime.now().isoformat()
                    })
            
            # 发送响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {'success': True, 'message': '信令已转发'}
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            logger.error(f"处理信令请求失败: {e}")
            self.send_error(500, "Internal Server Error")
    
    def handle_poll(self):
        """处理轮询请求"""
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        user_id = query_params.get('user_id', [None])[0]
        
        if not user_id:
            self.send_error(400, "Bad Request")
            return
        
        # 更新用户最后活跃时间
        if user_id in users:
            users[user_id]['last_seen'] = datetime.now()
        
        # 获取待发送的消息
        user_messages = messages.get(user_id, [])
        
        # 发送响应
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'messages': user_messages,
            'timestamp': datetime.now().isoformat()
        }
        self.wfile.write(json.dumps(response).encode())
        
        # 清空已发送的消息
        messages[user_id] = []
    
    def log_message(self, format, *args):
        """重写日志方法"""
        logger.info(f"{self.address_string()} - {format % args}")
    
    def handle_static_file(self):
        """处理静态文件和React Router路由"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # 如果是API路径，返回404
        if path.startswith('/api/'):
            self.send_error(404, "API Not Found")
            return
        
        # 如果是静态资源文件（js, css, images等）或HTML文件，直接提供文件
        if (path.startswith('/static/') or 
            path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.html'))):
            try:
                super().do_GET()
                return
            except FileNotFoundError:
                self.send_error(404, "File Not Found")
                return
        
        # 对于所有其他路径（React Router路由），返回index.html
        try:
            with open('index.html', 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404, "index.html not found")

def cleanup_inactive_users():
    """清理不活跃的用户"""
    while True:
        try:
            current_time = datetime.now()
            inactive_users = []
            
            for user_id, user in users.items():
                if (current_time - user['last_seen']).seconds > 300:  # 5分钟不活跃
                    inactive_users.append(user_id)
            
            for user_id in inactive_users:
                user = users.get(user_id)
                if user and user['room_id']:
                    room_id = user['room_id']
                    if room_id in rooms:
                        rooms[room_id]['users'] = [
                            u for u in rooms[room_id]['users'] 
                            if u['user_id'] != user_id
                        ]
                        
                        # 如果房间空了，删除房间
                        if not rooms[room_id]['users']:
                            del rooms[room_id]
                
                del users[user_id]
                if user_id in messages:
                    del messages[user_id]
                
                logger.info(f"清理不活跃用户: {user_id}")
            
            time.sleep(60)  # 每分钟检查一次
            
        except Exception as e:
            logger.error(f"清理用户失败: {e}")
            time.sleep(60)

def create_simple_cert():
    """创建简单的自签名证书"""
    import subprocess
    
    try:
        # 创建私钥
        subprocess.run([
            "openssl", "genrsa", "-out", "server.key", "2048"
        ], check=True, capture_output=True)
        
        # 创建证书配置文件
        with open("cert.conf", "w") as f:
            f.write("""[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
ST = Beijing
L = Beijing
O = PiaoLiuPing
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = 192.168.1.6
""")
        
        # 创建证书
        subprocess.run([
            "openssl", "req", "-new", "-x509", "-key", "server.key", 
            "-out", "server.crt", "-days", "365", "-config", "cert.conf"
        ], check=True, capture_output=True)
        
        # 清理配置文件
        os.remove("cert.conf")
        
        print("✅ SSL证书创建成功")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 创建SSL证书失败: {e}")
        print("💡 请确保已安装OpenSSL")
    except FileNotFoundError:
        print("❌ 未找到OpenSSL")
        print("💡 macOS安装: brew install openssl")
        print("💡 Ubuntu安装: sudo apt-get install openssl")

def start_https_server(port=3444):
    """启动HTTPS服务器"""
    
    # 检查是否在build目录
    if not os.path.exists("index.html"):
        print("❌ 请在build目录中运行此脚本")
        print("💡 使用方法: cd build && python3 ../https_server.py")
        return
    
    # 创建简单的自签名证书
    if not os.path.exists("server.crt") or not os.path.exists("server.key"):
        print("🔐 创建SSL证书...")
        create_simple_cert()
    
    # 启动清理线程
    cleanup_thread = threading.Thread(target=cleanup_inactive_users, daemon=True)
    cleanup_thread.start()
    
    # 创建HTTPS服务器
    with socketserver.TCPServer(("0.0.0.0", port), VoiceChatHandler) as httpd:
        # 配置SSL
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain("server.crt", "server.key")
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print(f"🚀 HTTPS服务器启动成功!")
        print(f"📱 手机访问: https://192.168.1.6:{port}")
        print(f"💻 电脑访问: https://localhost:{port}")
        print(f"🔒 SSL证书: 自签名证书")
        print(f"⚠️  浏览器会显示'不安全'警告，请点击'高级' → '继续访问'")
        print("🔧 API端点:")
        print(f"  POST https://192.168.1.6:{port}/api/join_room - 加入房间")
        print(f"  POST https://192.168.1.6:{port}/api/signal - 发送信令")
        print(f"  GET https://192.168.1.6:{port}/api/poll?user_id=xxx - 轮询消息")
        print(f"  GET https://192.168.1.6:{port}/api/health - 健康检查")
        print(f"  GET https://192.168.1.6:{port}/api/rooms - 房间列表")
        print("按 Ctrl+C 停止服务器")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 服务器已停止")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3444
    start_https_server(port)
