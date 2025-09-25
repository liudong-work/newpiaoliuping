import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Bottle {
  _id: string;
  content: string;
  senderName: string;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function PickBottleScreen({ navigation, route }: any) {
  const { bottle }: { bottle: Bottle } = route.params || {};
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isPicked, setIsPicked] = useState(false);

  const handlePickBottle = () => {
    Alert.alert(
      '捡到瓶子！',
      '你捡到了一个漂流瓶，是否要回复发送者？',
      [
        {
          text: '不回复',
          style: 'cancel',
          onPress: () => {
            setIsPicked(true);
            setTimeout(() => {
              Alert.alert('完成', '瓶子已捡起！');
              navigation.goBack();
            }, 1000);
          }
        },
        {
          text: '回复',
          onPress: () => setShowReplyModal(true)
        }
      ]
    );
  };

  const handleSendReply = () => {
    if (!replyContent.trim()) {
      Alert.alert('提示', '请输入回复内容');
      return;
    }

    // 这里应该调用后端API发送消息
    Alert.alert(
      '回复成功！',
      '你的回复已经发送给瓶子主人了！',
      [
        {
          text: '确定',
          onPress: () => {
            setIsPicked(true);
            setShowReplyModal(false);
            setReplyContent('');
            setTimeout(() => {
              navigation.goBack();
            }, 1000);
          }
        }
      ]
    );
  };

  if (!bottle) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>没有找到瓶子</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.bottleContainer}>
        <View style={styles.bottleHeader}>
          <View style={styles.senderInfo}>
            <Ionicons name="person-circle" size={40} color="#007AFF" />
            <View style={styles.senderDetails}>
              <Text style={styles.senderName}>{bottle.senderName}</Text>
              <Text style={styles.sendTime}>
                {new Date(bottle.createdAt).toLocaleDateString()} {new Date(bottle.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.locationText}>海上漂流</Text>
          </View>
        </View>

        <View style={styles.bottleContent}>
          <Text style={styles.contentText}>{bottle.content}</Text>
        </View>

        <View style={styles.bottleFooter}>
          <Text style={styles.footerText}>
            🌊 这个瓶子在海上漂流了 {Math.floor(Math.random() * 30) + 1} 天
          </Text>
        </View>
      </View>

      {!isPicked && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.pickButton}
            onPress={handlePickBottle}
          >
            <Ionicons name="hand-left" size={24} color="white" />
            <Text style={styles.pickButtonText}>捡起瓶子</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPicked && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={60} color="#4ECDC4" />
          <Text style={styles.successText}>瓶子已捡起！</Text>
        </View>
      )}

      {/* 回复模态框 */}
      <Modal
        visible={showReplyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>回复瓶子主人</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.replyInput}
              placeholder="写下你想对瓶子主人说的话..."
              value={replyContent}
              onChangeText={setReplyContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={300}
            />

            <Text style={styles.characterCount}>
              {replyContent.length}/300
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowReplyModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSendReply}
              >
                <Text style={styles.sendButtonText}>发送回复</Text>
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
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottleContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  sendTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  bottleContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bottleFooter: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionContainer: {
    padding: 20,
  },
  pickButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  pickButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginTop: 10,
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
    maxHeight: '80%',
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
  replyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
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
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.45,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
