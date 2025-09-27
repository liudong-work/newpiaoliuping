import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageService } from '../services/bottleService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  senderName: string;
  isRead: boolean;
  createdAt: string;
  bottleId?: string;
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

export default function ConversationDetailScreen({ navigation, route }: any) {
  const { conversation }: { conversation: Conversation } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversationMessages();
    
    // 启用WebSocket监听
    socketService.onNewMessage(handleNewMessage);
    
    return () => {
      socketService.offNewMessage(handleNewMessage);
    };
  }, []);

  const handleNewMessage = (newMessage: any) => {
    // 检查是否是当前对话的消息
    if (newMessage.bottleId === conversation.bottleId) {
      console.log('✅ 对话详情收到新消息:', newMessage);
      
      // 检查是否是当前用户相关的消息
      if (newMessage.senderId === currentUser?._id || newMessage.receiverId === currentUser?._id) {
        console.log('✅ 这是当前用户相关的消息，添加到消息列表');
        setMessages(prev => [...prev, newMessage]);
      } else {
        console.log('❌ 这不是当前用户相关的消息，忽略');
      }
    } else {
      console.log('❌ 这不是当前对话的消息，忽略');
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

  const loadConversationMessages = async () => {
    setIsLoading(true);
    try {
      // 获取所有消息
      const allMessages = await MessageService.getAllMessages();
      
      // 过滤出当前瓶子的消息
      const conversationMessages = allMessages.filter(
        (msg: any) => msg.bottleId === conversation.bottleId
      );
      
      // 格式化消息数据
      const formattedMessages: Message[] = conversationMessages.map((msg: any) => ({
        _id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        senderName: msg.senderId.includes('picker') ? '我' : conversation.bottleSenderName,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        bottleId: msg.bottleId,
      }));

      // 不添加原瓶子内容作为消息，只显示实际的消息
      // 按时间排序
      formattedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('加载对话消息失败:', error);
      if (Platform.OS === 'web') {
        alert('加载消息失败，请重试');
      } else {
        Alert.alert('错误', '加载消息失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      if (Platform.OS === 'web') {
        alert('请输入回复内容');
      } else {
        Alert.alert('提示', '请输入回复内容');
      }
      return;
    }

    setIsSending(true);
    try {
      // 发送回复消息：使用当前用户ID
      const result = await MessageService.sendMessage(
        currentUser._id, // 当前用户ID
        conversation.bottleSenderId, // 原瓶子发送者ID
        replyContent.trim(),
        conversation.bottleId,
        currentUser.username // 发送者姓名
      );

      console.log('回复发送成功:', result);

      // 暂时禁用实时推送，先确保基本功能正常
      // const pushSuccess = socketService.sendMessage(conversation.bottleSenderId, {
      //   ...result,
      //   bottleId: conversation.bottleId,
      //   senderId: currentUser._id,
      //   receiverId: conversation.bottleSenderId,
      //   content: replyContent.trim(),
      //   createdAt: new Date().toISOString(),
      // });

      // if (!pushSuccess) {
      //   console.warn('实时推送发送失败，但消息已保存');
      // }

      if (Platform.OS === 'web') {
        alert('回复已发送！');
      } else {
        Alert.alert('成功', '回复已发送！');
      }

      // 清空输入框
      setReplyContent('');
      
      // 重新加载消息
      await loadConversationMessages();
      
    } catch (error) {
      console.error('发送回复失败:', error);
      if (Platform.OS === 'web') {
        alert('发送回复失败，请重试');
      } else {
        Alert.alert('错误', '发送回复失败，请重试');
      }
    } finally {
      setIsSending(false);
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
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.messagesContainer}>
        {/* 瓶子信息 */}
        <View style={styles.bottleInfo}>
          <View style={styles.bottleHeader}>
            <Ionicons name="water" size={20} color="#4A90E2" />
            <Text style={styles.bottleTitle}>漂流瓶内容</Text>
          </View>
          <Text style={styles.bottleContent}>{conversation.bottleContent}</Text>
          <Text style={styles.bottleSender}>来自：{conversation.bottleSenderName}</Text>
        </View>

        {/* 消息列表 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : (
          messages.map((message) => {
            // 判断消息是否来自当前用户
            const isMyMessage = currentUser && message.senderId === currentUser._id;
            
            return (
              <View
                key={message._id}
                style={[
                  styles.messageItem,
                  isMyMessage ? styles.myMessage : styles.otherMessage
                ]}
              >
                {/* 头像 */}
                <View style={styles.avatarContainer}>
                  <View style={[
                    styles.avatar,
                    isMyMessage ? styles.myAvatar : styles.otherAvatar
                  ]}>
                    <Text style={styles.avatarText}>
                      {isMyMessage ? '我' : (message.senderName ? message.senderName.charAt(0) : '?')}
                    </Text>
                  </View>
                </View>
                
                {/* 消息内容 */}
                <View style={[
                  styles.messageContent,
                  isMyMessage ? styles.myMessageContent : styles.otherMessageContent
                ]}>
                  <Text style={[
                    styles.messageText,
                    isMyMessage ? styles.myMessageText : styles.otherMessageText
                  ]}>{message.content}</Text>
                  <Text style={[
                    styles.messageTime,
                    isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                  ]}>{formatTime(message.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 回复输入框 */}
      <View style={styles.replyContainer}>
        <TextInput
          style={styles.replyInput}
          placeholder="输入回复..."
          multiline
          value={replyContent}
          onChangeText={setReplyContent}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          onPress={handleSendReply}
          disabled={isSending}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={isSending ? "#ccc" : "white"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  bottleInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bottleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginLeft: 8,
  },
  bottleContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  bottleSender: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  messageItem: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessage: {
    flexDirection: 'row-reverse',
  },
  otherMessage: {
    flexDirection: 'row',
  },
  avatarContainer: {
    marginHorizontal: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  myAvatar: {
    backgroundColor: '#007AFF',
  },
  otherAvatar: {
    backgroundColor: '#E3F2FD',
  },
  avatarText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageContent: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessageContent: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageContent: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#999',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
