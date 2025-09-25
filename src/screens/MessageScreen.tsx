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
}

export default function MessageScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // 调用后端API获取消息
      const apiMessages = await MessageService.getUserMessages('user123'); // 临时使用固定用户ID
      
      // 格式化消息数据
      const formattedMessages: Message[] = apiMessages.map((msg: any) => ({
        _id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        senderName: msg.senderId === 'user123' ? '我' : '用户' + msg.senderId.slice(-4),
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('加载消息失败:', error);
      // 如果API失败，使用模拟数据
      const mockMessages: Message[] = [
        {
          _id: '1',
          senderId: 'user1',
          receiverId: 'user123',
          content: '谢谢你捡到我的瓶子！很高兴认识你！',
          senderName: '海边的旅行者',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];
      setMessages(mockMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagePress = async (message: Message) => {
    if (Platform.OS === 'web') {
      alert(`消息详情:\n\n${message.content}`);
    } else {
      Alert.alert(
        '消息详情',
        message.content,
        [
          {
            text: '确定',
            onPress: async () => {
              // 标记为已读
              if (!message.isRead && message.receiverId === 'user123') {
                try {
                  await MessageService.markMessageAsRead(message._id);
                  setMessages(prev => 
                    prev.map(msg => 
                      msg._id === message._id ? { ...msg, isRead: true } : msg
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

  const filteredMessages = messages.filter(message => {
    if (activeTab === 'received') {
      return message.receiverId === 'user123';
    } else {
      return message.senderId === 'user123';
    }
  });

  const unreadCount = messages.filter(msg => 
    !msg.isRead && msg.receiverId === 'user123'
  ).length;

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
        {filteredMessages.length === 0 ? (
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
          filteredMessages.map((message) => (
            <TouchableOpacity
              key={message._id}
              style={[
                styles.messageCard,
                !message.isRead && message.receiverId === 'current_user' && styles.unreadMessage
              ]}
              onPress={() => handleMessagePress(message)}
            >
              <View style={styles.messageHeader}>
                <View style={styles.senderInfo}>
                  <Ionicons 
                    name="person-circle" 
                    size={30} 
                    color={message.senderId === 'current_user' ? '#4ECDC4' : '#007AFF'} 
                  />
                  <View style={styles.senderDetails}>
                    <Text style={styles.senderName}>{message.senderName}</Text>
                    <Text style={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                {!message.isRead && message.receiverId === 'current_user' && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              
              <Text style={styles.messageContent} numberOfLines={2}>
                {message.content}
              </Text>
              
              <View style={styles.messageFooter}>
                <Ionicons 
                  name={message.senderId === 'current_user' ? 'send' : 'mail'} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.messageType}>
                  {message.senderId === 'current_user' ? '已发送' : '收到'}
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
  messageCard: {
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
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderDetails: {
    marginLeft: 10,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
});
