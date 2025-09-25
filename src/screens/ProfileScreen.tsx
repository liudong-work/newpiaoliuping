import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

interface Bottle {
  _id: string;
  content: string;
  createdAt: string;
  isPicked: boolean;
  pickedBy?: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [myBottles, setMyBottles] = useState<Bottle[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    loadUserData();
    loadMyBottles();
  }, []);

  const loadUserData = async () => {
    try {
      // 这里应该调用后端API获取用户信息
      // const response = await fetch('http://localhost:3000/api/users/current_user_id');
      // const data = await response.json();
      
      // 模拟数据
      const mockUser: User = {
        id: 'current_user',
        username: '漂流者',
        email: 'user@example.com',
        avatar: '',
      };
      
      setUser(mockUser);
      setEditUsername(mockUser.username);
      setEditEmail(mockUser.email);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadMyBottles = async () => {
    try {
      // 这里应该调用后端API获取我的瓶子
      // const response = await fetch('http://localhost:3000/api/users/current_user_id/bottles');
      // const data = await response.json();
      
      // 模拟数据
      const mockBottles: Bottle[] = [
        {
          _id: '1',
          content: '今天心情很好，希望有人能捡到这个瓶子！',
          createdAt: new Date().toISOString(),
          isPicked: true,
          pickedBy: 'user1',
        },
        {
          _id: '2',
          content: '我在寻找一个可以聊天的朋友...',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          isPicked: false,
        },
        {
          _id: '3',
          content: '分享一首我喜欢的歌给大家！',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          isPicked: true,
          pickedBy: 'user2',
        },
      ];
      
      setMyBottles(mockBottles);
    } catch (error) {
      console.error('加载我的瓶子失败:', error);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    if (!editUsername.trim() || !editEmail.trim()) {
      Alert.alert('提示', '用户名和邮箱不能为空');
      return;
    }

    // 这里应该调用后端API更新用户信息
    setUser(prev => prev ? {
      ...prev,
      username: editUsername.trim(),
      email: editEmail.trim(),
    } : null);
    
    setShowEditModal(false);
    Alert.alert('成功', '个人信息已更新');
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          style: 'destructive',
          onPress: () => {
            // 这里应该清除用户登录状态
            Alert.alert('提示', '已退出登录');
          }
        }
      ]
    );
  };

  const getBottleStatus = (bottle: Bottle) => {
    if (bottle.isPicked) {
      return { text: '已被捡起', color: '#4ECDC4', icon: 'checkmark-circle' };
    } else {
      return { text: '漂流中', color: '#FF6B6B', icon: 'water' };
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.editButtonText}>编辑资料</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutButtonText}>退出登录</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{myBottles.length}</Text>
          <Text style={styles.statLabel}>扔出的瓶子</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {myBottles.filter(bottle => bottle.isPicked).length}
          </Text>
          <Text style={styles.statLabel}>被捡起的瓶子</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {myBottles.filter(bottle => !bottle.isPicked).length}
          </Text>
          <Text style={styles.statLabel}>漂流中的瓶子</Text>
        </View>
      </View>

      <View style={styles.bottlesContainer}>
        <Text style={styles.sectionTitle}>我的瓶子</Text>
        {myBottles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>还没有扔过瓶子</Text>
            <Text style={styles.emptySubtext}>去海里扔一个瓶子吧！</Text>
          </View>
        ) : (
          myBottles.map((bottle) => {
            const status = getBottleStatus(bottle);
            return (
              <View key={bottle._id} style={styles.bottleCard}>
                <View style={styles.bottleHeader}>
                  <View style={styles.bottleStatus}>
                    <Ionicons name={status.icon} size={16} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.text}
                    </Text>
                  </View>
                  <Text style={styles.bottleTime}>
                    {new Date(bottle.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.bottleContent} numberOfLines={3}>
                  {bottle.content}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* 编辑资料模态框 */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>编辑资料</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>用户名</Text>
              <TextInput
                style={styles.textInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="请输入用户名"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>邮箱</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="请输入邮箱"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#007AFF',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  bottlesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  bottleCard: {
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
  bottleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bottleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  bottleTime: {
    fontSize: 12,
    color: '#666',
  },
  bottleContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.45,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.45,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
