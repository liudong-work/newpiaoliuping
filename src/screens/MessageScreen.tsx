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
    
    // 启用WebSocket监听
    socketService.onNewMessage(handleNewMessage);
    
    // 添加定时刷新，每10秒刷新一次消息列表（作为备用）
    const interval = setInterval(() => {
      if (currentUser) {
        loadMessages();
      }
    }, 10000);
    
    return () => {
      clearInterval(interval);
      socketService.offNewMessage(handleNewMessage);
    };
  }, []);

  // 当currentUser加载完成后，加载消息
  useEffect(() => {
    if (currentUser) {
      console.log('🔔 当前用户已加载，开始加载消息:', currentUser._id);
      loadMessages();
    }
  }, [currentUser]);

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
    if (!currentUser) {
      console.log('⏳ 当前用户未加载，等待用户数据...');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('开始加载消息...');
      console.log('当前用户ID:', currentUser._id);
      
      // 获取所有消息和瓶子
      const [allMessages, allBottles] = await Promise.all([
        MessageService.getAllMessages(),
        ApiService.bottle.getAll()
      ]);
      
      console.log('获取到消息数量:', allMessages.length);
      console.log('获取到瓶子数量:', allBottles.bottles.length);
      
      setBottles(allBottles.bottles);
      
      // 过滤出当前用户相关的消息（发送、接收、或瓶子相关）
      const userRelatedMessages = allMessages.filter((msg: any) => {
        // 1. 当前用户发送或接收的消息
        const isDirectMessage = msg.senderId === currentUser._id || msg.receiverId === currentUser._id;
        
        // 2. 当前用户扔的瓶子被回复的消息
        const bottleInfo = allBottles.bottles.find((bottle: any) => bottle._id === msg.bottleId);
        const isBottleRelated = bottleInfo && bottleInfo.senderId === currentUser._id;
        
        // 3. 当前用户捡到的瓶子并回复的消息
        const isPickedBottle = bottleInfo && bottleInfo.pickedBy === currentUser._id;
        
        const isRelated = isDirectMessage || isBottleRelated || isPickedBottle;
        
        console.log(`消息 ${msg._id}: 发送者=${msg.senderId}, 接收者=${msg.receiverId}, 瓶子发送者=${bottleInfo?.senderId}, 瓶子捡取者=${bottleInfo?.pickedBy}, 是否相关=${isRelated}`);
        return isRelated;
      });
      
      console.log('当前用户相关消息数量:', userRelatedMessages.length);
      
      // 格式化消息数据，并添加瓶子信息
      const formattedMessages: Message[] = userRelatedMessages.map((msg: any) => {
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

      // 创建对话列表：只显示有回复消息的瓶子
      const conversationMap = new Map<string, Conversation>();
      
      // 先收集有消息的瓶子ID
      const bottlesWithMessages = new Set<string>();
      formattedMessages.forEach(message => {
        if (message.bottleId) {
          bottlesWithMessages.add(message.bottleId);
        }
      });
      
      // 只为有消息的瓶子创建对话条目
      allBottles.bottles.forEach((bottle: any) => {
        if (bottlesWithMessages.has(bottle._id)) {
          // 确定对话的显示名称：如果是当前用户捡到的瓶子，显示原发送者；如果是当前用户扔的瓶子，显示捡取者
          let displayName = bottle.senderName;
          if (bottle.pickedBy === currentUser._id) {
            displayName = bottle.senderName; // 显示原瓶子发送者
          } else if (bottle.senderId === currentUser._id) {
            displayName = '捡到瓶子的人'; // 显示捡取者（如果有的话）
          }
          
          conversationMap.set(bottle._id, {
            bottleId: bottle._id,
            bottleContent: bottle.content,
            bottleSenderName: displayName,
            bottleSenderId: bottle.senderId,
            lastMessage: {
              _id: 'bottle_' + bottle._id,
              senderId: bottle.senderId,
              receiverId: '',
              content: bottle.content,
              senderName: displayName,
              isRead: true,
              createdAt: bottle.createdAt,
              bottleId: bottle._id,
            },
            unreadCount: 0,
            totalMessages: 0,
          });
        }
      });
      
      // 更新有消息的瓶子
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
      <ScrollView style={styles.messagesContainer}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#E0E0E0" />
            </View>
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
                <View style={[
                  styles.avatar,
                  conversation.unreadCount > 0 && styles.unreadAvatar
                ]}>
                  <Text style={styles.avatarText}>
                    {conversation.lastMessage.senderId.includes('picker') ? '我' : 
                     conversation.bottleSenderName.charAt(0)}
                  </Text>
                </View>
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.senderName}>
                    {conversation.lastMessage.senderId.includes('picker') ? '我' : 
                     conversation.bottleSenderName}
                  </Text>
                  <Text style={styles.messageTime}>
                    {formatTime(conversation.lastMessage.createdAt)}
                  </Text>
                </View>
                <Text style={[
                  styles.messageText,
                  conversation.unreadCount > 0 && styles.unreadMessageText
                ]} numberOfLines={2}>
                  {conversation.lastMessage.content}
                </Text>
              </View>
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
    backgroundColor: '#f5f5f5',
  },
  messagesContainer: {
    flex: 1,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  messageCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  unreadMessage: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  unreadAvatar: {
    backgroundColor: '#007AFF',
  },
  avatarText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  messageTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
  },
  unreadMessageText: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
});
