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
import { Ionicons } from '@expo/vector-icons';
import { MessageService, BottleService } from '../services/bottleService';
import ApiService from '../services/api';

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
  lastMessage: Message;
  unreadCount: number;
  totalMessages: number;
}

export default function MessageScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bottles, setBottles] = useState<any[]>([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const getBottleInfo = (bottleId: string) => {
    return bottles.find(bottle => bottle._id === bottleId);
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // 获取所有消息和瓶子
      const [allMessages, allBottles] = await Promise.all([
        MessageService.getAllMessages(),
        ApiService.bottle.getAll()
      ]);
      
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
          senderName: msg.senderId.includes('picker') ? '我' : '用户' + msg.senderId.slice(-4),
          isRead: msg.isRead,
          createdAt: msg.createdAt,
          bottleId: msg.bottleId,
          bottleContent: bottleInfo?.content || '未知瓶子内容',
          bottleSenderName: bottleInfo?.senderName || '未知发送者',
        };
      });

      // 按瓶子ID分组，创建对话列表
      const conversationMap = new Map<string, Conversation>();
      
      formattedMessages.forEach(message => {
        if (message.bottleId) {
          if (!conversationMap.has(message.bottleId)) {
            conversationMap.set(message.bottleId, {
              bottleId: message.bottleId,
              bottleContent: message.bottleContent || '未知瓶子内容',
              bottleSenderName: message.bottleSenderName || '未知发送者',
              lastMessage: message,
              unreadCount: 0,
              totalMessages: 0,
            });
          }
          
          const conversation = conversationMap.get(message.bottleId)!;
          conversation.totalMessages++;
          
          // 更新最后一条消息（按时间排序）
          if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
            conversation.lastMessage = message;
          }
          
          // 计算未读消息数 - 显示所有有回复的对话，不区分用户
          // 暂时不计算未读数量，显示所有对话
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('加载消息失败:', error);
      // 如果API失败，显示空列表
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationPress = async (conversation: Conversation) => {
    const message = conversation.lastMessage;
    
    if (Platform.OS === 'web') {
      alert(`瓶子内容:\n${conversation.bottleContent}\n\n最后消息:\n${message.content}`);
    } else {
      Alert.alert(
        '对话详情',
        `瓶子内容:\n${conversation.bottleContent}\n\n最后消息:\n${message.content}`,
        [
          {
            text: '确定',
            onPress: async () => {
              // 标记为已读 - 暂时跳过，因为不计算未读数量
              try {
                await MessageService.markMessageAsRead(message._id);
              } catch (error) {
                console.error('标记消息已读失败:', error);
              }
            }
          }
        ]
      );
    }
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
                    {conversation.bottleSenderName.charAt(0)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.messageContent}>
                <Text style={styles.senderName}>{conversation.bottleSenderName}</Text>
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
