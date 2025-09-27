import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MessageService, BottleService } from '../services/bottleService';
import ApiService from '../services/api';
import socketService from '../services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  senderName: string;
  isRead: boolean;
  createdAt: string;
  bottleId?: string;
  bottleContent?: string;
  bottleSenderName?: string;
}

interface Conversation {
  bottleId: string;
  bottleContent: string;
  bottleSenderName: string;
  bottleSenderId: string; // 添加原瓶子发送者ID
  lastMessage: Message;
  unreadCount: number;
  totalMessages: number;
}

export default function MessageScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bottles, setBottles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    
    // 启用WebSocket监听
    socketService.onNewMessage(handleNewMessage);
    
    // 添加定时刷新，每10秒刷新一次消息列表（作为备用）
    const interval = setInterval(loadMessages, 10000);
    
    return () => {
      clearInterval(interval);
      socketService.offNewMessage(handleNewMessage);
    };
  }, []);

  const handleNewMessage = (newMessage: any) => {
    console.log('消息列表收到新消息:', newMessage);
    
    // 检查是否是当前用户相关的消息（发送或接收）
    if (newMessage.senderId === currentUser?._id || newMessage.receiverId === currentUser?._id) {
      console.log('✅ 这是当前用户相关的消息，刷新消息列表');
      // 刷新消息列表
      loadMessages();
    } else {
      console.log('❌ 这不是当前用户相关的消息，忽略');
    }
  };

  const loadCurrentUser = async () => {
    try {
      // Web端兼容性处理
      if (Platform.OS === 'web') {
        const userData = localStorage.getItem('user');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
      } else {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  };

  // 当页面获得焦点时刷新消息列表
  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
    }, [])
  );

  const getBottleInfo = (bottleId: string) => {
    return bottles.find(bottle => bottle._id === bottleId);
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      console.log('开始加载消息...');
      
      // 获取所有消息和瓶子
      const [allMessages, allBottles] = await Promise.all([
        MessageService.getAllMessages(),
        ApiService.bottle.getAll()
      ]);
      
      console.log('获取到消息数量:', allMessages.length);
      console.log('获取到瓶子数量:', allBottles.bottles.length);
      
      setBottles(allBottles.bottles);
      
      // 格式化消息数据，并添加瓶子信息
      const formattedMessages: Message[] = allMessages.map((msg: any) => {
        // 从消息中提取瓶子信息（如果后端没有提供，我们需要从瓶子ID获取）
        const bottleInfo = allBottles.bottles.find((bottle: any) => bottle._id === msg.bottleId);
        
        return {
          _id: msg._id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          senderName: msg.senderId.includes('picker') ? '我' : bottleInfo?.senderName || '用户' + msg.senderId.slice(-4),
          isRead: msg.isRead,
          createdAt: msg.createdAt,
          bottleId: msg.bottleId,
          bottleContent: bottleInfo?.content || '未知瓶子内容',
          bottleSenderName: bottleInfo?.senderName || '未知发送者',
        };
      });

      // 创建对话列表：显示所有相关的瓶子（扔的瓶子和有回复的瓶子）
      const conversationMap = new Map<string, Conversation>();
      
      // 首先为所有瓶子创建对话条目（包括扔的瓶子和有回复的瓶子）
      allBottles.bottles.forEach((bottle: any) => {
        conversationMap.set(bottle._id, {
          bottleId: bottle._id,
          bottleContent: bottle.content,
          bottleSenderName: bottle.senderName,
          bottleSenderId: bottle.senderId,
          lastMessage: {
            _id: 'bottle_' + bottle._id,
            senderId: bottle.senderId,
            receiverId: '',
            content: bottle.content,
            senderName: bottle.senderName,
            isRead: true,
            createdAt: bottle.createdAt,
            bottleId: bottle._id,
          },
          unreadCount: 0,
          totalMessages: 0,
        });
      });
      
      // 然后更新有消息的瓶子
      formattedMessages.forEach(message => {
        if (message.bottleId && conversationMap.has(message.bottleId)) {
          const conversation = conversationMap.get(message.bottleId)!;
          conversation.totalMessages++;
          
          // 更新最后一条消息（按时间排序）
          if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
            conversation.lastMessage = message;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
      console.log('消息加载完成，对话数量:', conversationMap.size);
    } catch (error: any) {
      console.error('加载消息失败:', error);
      console.error('错误详情:', error?.message);
      console.error('错误堆栈:', error?.stack);
      
      // 如果API失败，显示空列表
      setConversations([]);
      setBottles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationPress = async (conversation: Conversation) => {
    // 导航到对话详情页面
    navigation.navigate('ConversationDetail', { conversation });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 604800000) { // 7天内
      return `${Math.floor(diff / 86400000)}天前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 显示所有有回复的对话，不区分收到和发送
  const filteredConversations = conversations;

  const unreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.bottleIcon}>
            <Ionicons name="water" size={32} color="#4A90E2" />
          </View>
          <Text style={styles.title}>漂流瓶消息列表</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>


      <ScrollView style={styles.messagesContainer}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              还没有回复过的瓶子
            </Text>
            <Text style={styles.emptySubtext}>
              捡到瓶子并回复后，这里会显示你的对话记录
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.bottleId}
              style={[
                styles.messageCard,
                conversation.unreadCount > 0 && styles.unreadMessage
              ]}
              onPress={() => handleConversationPress(conversation)}
            >
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {conversation.lastMessage.senderId.includes('picker') ? '我' : 
                     conversation.bottleSenderName.charAt(0)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.messageContent}>
                <Text style={styles.senderName}>
                  {conversation.lastMessage.senderId.includes('picker') ? '我' : 
                   conversation.bottleSenderName}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                  {conversation.lastMessage.content}
                </Text>
              </View>
              
              {conversation.unreadCount > 0 && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  messageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadMessage: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
});
