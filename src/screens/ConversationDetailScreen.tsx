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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageService } from '../services/bottleService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import voiceCallService from '../services/voiceCallService';
import VoiceCallScreen from '../components/VoiceCallScreen';

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
  const [isInCall, setIsInCall] = useState(false);
  const [callData, setCallData] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');

  useEffect(() => {
    // 先加载当前用户，再加载消息
    const initializeData = async () => {
      await loadCurrentUser();
      await loadConversationMessages();
    };
    
    initializeData();
    
    // 设置通话监听
    voiceCallService.addCallListener(handleCallEvent);
    
    // 设置语音通话WebSocket监听
    socketService.onVoiceCallIncoming(handleIncomingCall);
    
    return () => {
      voiceCallService.removeCallListener(handleCallEvent);
      socketService.offVoiceCallIncoming(handleIncomingCall);
    };
  }, []);

  // 当currentUser加载完成后，设置WebSocket监听
  useEffect(() => {
    if (currentUser) {
      console.log('🔔 当前用户已加载，设置WebSocket监听:', currentUser._id);
      console.log('🔔 当前对话bottleId:', conversation.bottleId);
      socketService.onNewMessage(handleNewMessage);
    } else {
      console.log('⏳ 当前用户未加载，等待用户数据...');
    }

    return () => {
      console.log('🔔 移除WebSocket监听器');
      socketService.offNewMessage(handleNewMessage);
    };
  }, [currentUser]);

  const handleNewMessage = (newMessage: any, _retryCount = 0) => {
    console.log('🔔 对话详情收到新消息:', newMessage);
    console.log('🔔 当前对话bottleId:', conversation.bottleId);
    console.log('🔔 当前用户ID:', currentUser?._id);
    console.log('🔔 消息bottleId:', newMessage.bottleId);
    console.log('🔔 消息sentId:', newMessage.senderId);
    console.log('🔔 消息receiverId:', newMessage.receiverId);
    
    // 如果没有currentUser，添加重试机制
    if (!currentUser) {
      if (_retryCount < 5) {
        console.log(`⏳ 当前用户未加载,${_retryCount + 1}秒后重试`);
        setTimeout(() => {
          handleNewMessage(newMessage, _retryCount + 1);
        }, 1000);
        return;
      } else {
        console.log('❌ 重试次数超限，放弃处理消息');
        return;
      }
    }
    
    // 检查是否是当前对话的消息
    if (newMessage.bottleId === conversation.bottleId) {
      console.log('✅ 这是当前对话的消息');
      
      // 检查是否是当前用户相关的消息
      console.log('🔍 用户ID对比检查:');
      console.log('- 当前用户ID:', currentUser?._id);
      console.log('- 当前用户类型:', typeof currentUser?._id);
      console.log('- 消息发送者ID:', newMessage.senderId);
      console.log('- 消息发送者类型:', typeof newMessage.senderId);
      console.log('- 消息接收者ID:', newMessage.receiverId);
      console.log('- 消息接收者类型:', typeof newMessage.receiverId);
      console.log('- senderId匹配:', newMessage.senderId === currentUser?._id);
      console.log('- receiverId匹配:', newMessage.receiverId === currentUser?._id);
      console.log('- senderId === receiverId:', newMessage.senderId === newMessage.receiverId);
      
      if (newMessage.senderId === currentUser?._id || newMessage.receiverId === currentUser?._id) {
        console.log('✅ 这是当前用户相关的消息，检查是否已存在');
        
        // 检查消息是否已经存在，避免重复添加
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === newMessage._id);
          if (exists) {
            console.log('❌ 消息已存在，跳过添加');
            return prev;
          }
          console.log('✅ 添加新消息到列表');
          return [...prev, newMessage];
        });
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
        senderName: msg.senderName || '未知用户',
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

    if (!currentUser) {
      if (Platform.OS === 'web') {
        alert('用户信息未加载，请稍后重试');
      } else {
        Alert.alert('错误', '用户信息未加载，请稍后重试');
      }
      return;
    }

    setIsSending(true);
    try {
      // 确定接收者ID - 应该是对话中的对方
      const receiverId = currentUser?._id === conversation.bottleSenderId 
        ? messages[0]?.senderId || conversation.bottleSenderId // A发给B
        : conversation.bottleSenderId; // B发给A
        
      console.log('📤 发送消息详情:');
      console.log('- 发送者ID:', currentUser?._id);
      console.log('- 发送者姓名:', currentUser?.username);
      console.log('- 原瓶子发送者ID:', conversation.bottleSenderId);
      console.log('- 计算出的接收者ID:', receiverId);
      console.log('- 瓶子ID:', conversation.bottleId);
      console.log('- 消息内容:', replyContent.trim());
      
      const result = await MessageService.sendMessage(
        currentUser?._id, // 当前用户ID
        receiverId, // 正确的接收者ID
        replyContent.trim(),
        conversation.bottleId,
        currentUser?.username // 发送者姓名
      );

      console.log('回复发送成功:', result);

      // 清空输入框
      setReplyContent('');
      
      // 不在这里添加消息，等待WebSocket推送
      
    } catch (error) {
      console.error('发送回复失败:', error);
      if (Platform.OS === 'web') {
        alert('发送失败，请重试');
      } else {
        Alert.alert('错误', '发送失败，请重试');
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

  // 处理通话事件
  const handleCallEvent = (event: string, data: any) => {
    console.log('收到通话事件:', event, data);
    
    switch (event) {
      case 'incoming-call':
        setCallData(data);
        setIsInCall(true);
        break;
      case 'call-answered':
        console.log('通话已接听');
        break;
      case 'call-rejected':
        console.log('通话被拒绝');
        setIsInCall(false);
        setCallData(null);
        break;
      case 'call-ended':
        console.log('通话已结束');
        setIsInCall(false);
        setCallData(null);
        // 重置通话服务状态
        voiceCallService.resetCallState();
        break;
    }
  };

  // 发起语音通话
  const handleStartCall = () => {
    if (!currentUser) {
      Alert.alert('错误', '用户信息未加载');
      return;
    }
    
    // 显示通话确认弹窗
    setShowCallModal(true);
  };

  // 确认发起通话
  const handleConfirmCall = async () => {
    setShowCallModal(false);
    
    // 确定接收者ID - 应该是对话中的对方
    const receiverId = currentUser?._id === conversation.bottleSenderId 
      ? messages[0]?.senderId || conversation.bottleSenderId // A发给B
      : conversation.bottleSenderId; // B发给A
      
    const receiverName = currentUser?._id === conversation.bottleSenderId 
      ? messages[0]?.senderName || '对方' // A发给B
      : conversation.bottleSenderName; // B发给A
    
    console.log('准备发起语音通话:');
    console.log('发起者ID:', currentUser?._id);
    console.log('接收者ID:', receiverId);
    console.log('接收者姓名:', receiverName);
    
    // 设置通话状态
    setCallStatus('calling');
    setCallData({
      callId: `call_${Date.now()}`,
      receiverId,
      receiverName,
      status: 'calling'
    });
    
    const success = await voiceCallService.initiateCall(receiverId, receiverName);
    if (success) {
      console.log('发起语音通话成功');
    } else {
      Alert.alert('错误', '无法发起通话，请稍后重试');
      setCallStatus('idle');
      setCallData(null);
    }
  };

  // 取消发起通话
  const handleCancelCall = () => {
    setShowCallModal(false);
  };

  // 结束通话
  const handleEndCall = () => {
    if (callData) {
      voiceCallService.endCall(callData.callId);
    }
    setIsInCall(false);
    setCallData(null);
    setCallStatus('ended');
    // 重置通话服务状态
    voiceCallService.resetCallState();
  };

  // 接听通话
  const handleAnswerCall = () => {
    if (callData) {
      voiceCallService.answerCall(callData.callId);
      // 更新通话状态为已连接
      setCallData((prev: any) => prev ? { ...prev, status: 'connected' } : null);
    }
  };

  // 处理来电
  const handleIncomingCall = (incomingCallData: any, retryCount = 0) => {
    console.log('🔔🔔🔔 收到来电事件:', incomingCallData);
    console.log('🔔 当前用户ID:', currentUser?._id);
    console.log('🔔 来电接收者ID:', incomingCallData.receiverId);
    console.log('🔔 重试次数:', retryCount);
    console.log('🔔 来电者姓名:', incomingCallData.receiverName);
    
    // 如果当前用户未加载，等待用户加载完成
    if (!currentUser) {
      if (retryCount < 5) {
        console.log(`⏳ 当前用户未加载，${retryCount + 1}秒后重试...`);
        setTimeout(() => {
          handleIncomingCall(incomingCallData, retryCount + 1);
        }, 1000);
        return;
      } else {
        console.log('❌ 重试次数超限，但为了测试，直接显示来电弹窗');
        // 即使用户未加载，也显示来电弹窗进行测试
        setCallData(incomingCallData);
        setIsInCall(true);
        return;
      }
    }
    
    // 检查是否是当前用户应该接收的通话
    if (currentUser?._id === incomingCallData.receiverId) {
      console.log('✅ 这是给当前用户的来电，显示接听弹窗');
      setCallData(incomingCallData);
      setIsInCall(true);
    } else {
      console.log('❌ 这不是给当前用户的来电，但为了测试，也显示弹窗');
      // 为了测试，即使不是当前用户的来电也显示弹窗
      setCallData(incomingCallData);
      setIsInCall(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
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
          <View style={styles.messagesList}>
            {messages.map((message) => {
              // 判断消息是否来自当前用户
              const isMyMessage = currentUser && message.senderId === currentUser?._id;
              
              // 调试信息
              console.log('🔍 消息归属判断:');
              console.log('- 当前用户ID:', currentUser?._id);
              console.log('- 消息发送者ID:', message.senderId);
              console.log('- 是否是我的消息:', isMyMessage);
              console.log('- 消息内容:', message.content);
              
              return (
                <View
                  key={message._id}
                  style={[
                    styles.messageItem,
                    isMyMessage ? styles.myMessage : styles.otherMessage
                  ]}
                >
                {/* 头像 - 对方消息在左侧，我的消息在右侧 */}
                {!isMyMessage ? (
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {message.senderName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* 消息内容 */}
                <View style={styles.messageContent}>
                  <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
                  ]}>
                    <Text style={[
                      styles.messageText,
                      isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                      {message.content}
                    </Text>
                  </View>
                  <Text style={[
                    styles.messageTime,
                    isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                  ]}>
                    {formatTime(message.createdAt)}
                  </Text>
                </View>

                {/* 我的消息头像在右侧 */}
                {isMyMessage && (
                  <View style={styles.myAvatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {currentUser?.username?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 输入区域 */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          {/* 拨打电话按钮 */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: '#4ECDC4', marginRight: 10 }]}
            onPress={handleStartCall}
          >
            <Ionicons 
              name="call" 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="输入回复..."
            value={replyContent}
            onChangeText={setReplyContent}
            multiline
            maxLength={500}
            editable={!isSending}
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
          
          {/* 测试来电弹窗按钮 */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: '#FF6B6B', marginLeft: 10 }]}
            onPress={() => {
              console.log('🔔 测试来电弹窗');
              setCallData({
                callId: `test_call_${Date.now()}`,
                receiverId: currentUser?._id,
                receiverName: '测试用户',
                status: 'initiating'
              });
              setIsInCall(true);
            }}
          >
            <Ionicons 
              name="call" 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 通话确认弹窗 */}
      <Modal
        visible={showCallModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelCall}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>
            <View style={styles.callModalHeader}>
              <Ionicons name="call" size={48} color="#4ECDC4" />
              <Text style={styles.callModalTitle}>发起语音通话</Text>
              <Text style={styles.callModalSubtitle}>
                即将呼叫 {currentUser?._id === conversation.bottleSenderId 
                  ? (messages[0]?.senderName || '对方')
                  : conversation.bottleSenderName}
              </Text>
            </View>
            
            <View style={styles.callModalButtons}>
              <TouchableOpacity
                style={[styles.callModalButton, styles.cancelButton]}
                onPress={handleCancelCall}
              >
                <Ionicons name="close" size={24} color="#666" />
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.callModalButton, styles.confirmButton]}
                onPress={handleConfirmCall}
              >
                <Ionicons name="call" size={24} color="white" />
                <Text style={styles.confirmButtonText}>呼叫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 语音通话界面 */}
      {isInCall && callData && (
        <>
          {console.log('🔔 显示语音通话界面:', { isInCall, callData })}
          <VoiceCallScreen
            callerName={callData.receiverName || '未知用户'}
            callerId={callData.receiverId}
            isIncoming={callData.status === 'initiating'}
            isConnected={callData.status === 'connected' || callStatus === 'connected'}
            onEndCall={handleEndCall}
            onAnswerCall={handleAnswerCall}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bottleInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  bottleContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  bottleSender: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  myAvatarContainer: {
    marginLeft: 8,
    marginTop: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  myAvatar: {
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  otherAvatar: {
    backgroundColor: '#FF6B9D',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageContent: {
    flex: 1,
    maxWidth: '70%',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 4,
  },
  myMessageBubble: {
    backgroundColor: '#4ECDC4',
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
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
  },
  myMessageTime: {
    color: '#999',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#4ECDC4',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  callModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  callModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  callModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  callModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  callModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});