import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

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

export default function HomeScreen({ navigation }: any) {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [nearbyBottles, setNearbyBottles] = useState<Bottle[]>([]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限来使用漂流瓶功能');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  };

  const searchNearbyBottles = async () => {
    if (!location) {
      Alert.alert('提示', '请先获取位置信息');
      return;
    }

    try {
      // 这里应该调用后端API
      // const response = await fetch(`http://localhost:3000/api/bottles/pick?latitude=${location.latitude}&longitude=${location.longitude}`);
      // const data = await response.json();
      
      // 模拟数据
      const mockBottles: Bottle[] = [
        {
          _id: '1',
          content: '今天天气真好，希望有人能捡到这个瓶子！',
          senderName: '匿名用户',
          createdAt: new Date().toISOString(),
          location: { latitude: location.latitude + 0.001, longitude: location.longitude + 0.001 }
        },
        {
          _id: '2',
          content: '我在寻找一个可以聊天的朋友...',
          senderName: '孤独的旅行者',
          createdAt: new Date().toISOString(),
          location: { latitude: location.latitude - 0.001, longitude: location.longitude + 0.002 }
        }
      ];
      
      setNearbyBottles(mockBottles);
    } catch (error) {
      console.error('搜索瓶子失败:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌊 漂流瓶海</Text>
        <Text style={styles.subtitle}>在这里寻找来自远方的消息</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.throwButton]}
          onPress={() => navigation.navigate('ThrowBottle')}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.buttonText}>扔瓶子</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.pickButton]}
          onPress={searchNearbyBottles}
        >
          <Ionicons name="search" size={24} color="white" />
          <Text style={styles.buttonText}>捡瓶子</Text>
        </TouchableOpacity>
      </View>

      {nearbyBottles.length > 0 && (
        <View style={styles.bottlesContainer}>
          <Text style={styles.sectionTitle}>附近的瓶子</Text>
          {nearbyBottles.map((bottle) => (
            <TouchableOpacity 
              key={bottle._id}
              style={styles.bottleCard}
              onPress={() => navigation.navigate('PickBottle', { bottle })}
            >
              <View style={styles.bottleHeader}>
                <Text style={styles.senderName}>{bottle.senderName}</Text>
                <Text style={styles.time}>
                  {new Date(bottle.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.bottleContent} numberOfLines={3}>
                {bottle.content}
              </Text>
              <View style={styles.bottleFooter}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.locationText}>附近</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            当前位置: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  throwButton: {
    backgroundColor: '#FF6B6B',
  },
  pickButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  bottleContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  bottleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  locationInfo: {
    padding: 20,
    alignItems: 'center',
  },
});
