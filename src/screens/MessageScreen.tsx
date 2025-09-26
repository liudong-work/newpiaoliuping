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
import { MessageService } from '../services/bottleService';

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
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
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
        BottleService.getAllBottles()
      ]);
      
      setBottles(allBottles);
      
      // 格式化消息数据，并添加瓶子信息
      const formattedMessages: Message[] = allMessages.map((msg: any) => {
        // 从消息中提取瓶子信息（如果后端没有提供，我们需要从瓶子ID获取）
        const bottleInfo = getBottleInfo(msg.bottleId);
        
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
          
          // 计算未读消息数
          if (!message.isRead && message.receiverId === 'user123') {
            conversation.unreadCount++;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('加载消息失败:', error);
      // 如果API失败，使用模拟数据
      const mockConversations: Conversation[] = [
        {
          bottleId: 'bottle1',
          bottleContent: '今天天气真好，希望有人能捡到我的瓶子，和我分享你的故事...',
          bottleSenderName: '海边的旅行者',
          lastMessage: {
            _id: '1',
            senderId: 'user1',
            receiverId: 'user123',
            content: '谢谢你捡到我的瓶子！很高兴认识你！',
            senderName: '海边的旅行者',
            isRead: false,
            createdAt: new Date().toISOString(),
            bottleId: 'bottle1',
            bottleContent: '今天天气真好，希望有人能捡到我的瓶子，和我分享你的故事...',
            bottleSenderName: '海边的旅行者',
          },
          unreadCount: 1,
          totalMessages: 1,
        },
        {
          bottleId: 'bottle2',
          bottleContent: '我在寻找一个可以聊天的朋友，如果你看到这个瓶子，请回复我...',
          bottleSenderName: '远方的朋友',
          lastMessage: {
            _id: '2',
            senderId: 'user123',
            receiverId: 'user2',
            content: '很高兴认识你，希望我们能成为朋友！',
            senderName: '我',
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            bottleId: 'bottle2',
            bottleContent: '我在寻找一个可以聊天的朋友，如果你看到这个瓶子，请回复我...',
            bottleSenderName: '远方的朋友',
          },
          unreadCount: 0,
          totalMessages: 2,
        },
      ];
      setConversations(mockConversations);
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
              // 标记为已读
              if (!message.isRead && message.receiverId === 'user123') {
                try {
                  await MessageService.markMessageAsRead(message._id);
                  setConversations(prev => 
                    prev.map(conv => 
                      conv.bottleId === conversation.bottleId 
                        ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - 1) }
                        : conv
                    )
                  );
                } catch (error) {
                  console.error('标记消息已读失败:', error);
                }
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

  const filteredConversations = conversations.filter(conversation => {
    if (activeTab === 'received') {
      return conversation.lastMessage.receiverId === 'user123';
    } else {
      return conversation.lastMessage.senderId === 'user123';
    }
  });

  const unreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 消息</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            收到的消息
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            发送的消息
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === 'received' ? '还没有收到消息' : '还没有发送消息'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'received' 
                ? '捡到瓶子并回复后，这里会显示收到的消息' 
                : '回复瓶子后，这里会显示你发送的消息'
              }
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.bottleId}
              style={[
                styles.conversationCard,
                conversation.unreadCount > 0 && styles.unreadConversation
              ]}
              onPress={() => handleConversationPress(conversation)}
            >
              <View style={styles.conversationHeader}>
                <View style={styles.bottleInfo}>
                  <Ionicons 
                    name="water" 
                    size={24} 
                    color="#007AFF" 
                  />
                  <View style={styles.bottleDetails}>
                    <Text style={styles.bottleSenderName}>{conversation.bottleSenderName}</Text>
                    <Text style={styles.bottleTime}>
                      {formatTime(conversation.lastMessage.createdAt)}
                    </Text>
                  </View>
                </View>
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.bottleContentContainer}>
                <Text style={styles.bottleContentLabel}>瓶子内容:</Text>
                <Text style={styles.bottleContent} numberOfLines={2}>
                  {conversation.bottleContent}
                </Text>
              </View>
              
              <View style={styles.lastMessageContainer}>
                <Text style={styles.lastMessageLabel}>最后消息:</Text>
                <Text style={styles.lastMessageContent} numberOfLines={1}>
                  {conversation.lastMessage.content}
                </Text>
              </View>
              
              <View style={styles.conversationFooter}>
                <Ionicons 
                  name={conversation.lastMessage.senderId === 'user123' ? 'send' : 'mail'} 
                  size={14} 
                  color="#666" 
                />
                <Text style={styles.messageType}>
                  {conversation.lastMessage.senderId === 'user123' ? '我发送' : '收到回复'}
                </Text>
                <Text style={styles.messageCount}>
                  {conversation.totalMessages}条消息
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
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
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
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadConversation: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bottleDetails: {
    marginLeft: 10,
  },
  bottleSenderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bottleTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottleContentContainer: {
    marginBottom: 10,
  },
  bottleContentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  bottleContent: {
    fontSize: 14,
    lineHeight: 18,
    color: '#555',
    fontStyle: 'italic',
  },
  lastMessageContainer: {
    marginBottom: 10,
  },
  lastMessageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  lastMessageContent: {
    fontSize: 14,
    lineHeight: 18,
    color: '#333',
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  messageCount: {
    fontSize: 12,
    color: '#999',
  },
});
