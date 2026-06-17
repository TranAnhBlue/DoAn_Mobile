import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../api/api';

export default function AIScreen() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Xin chào! Tôi là Trợ lý AI của EBookFarm. Tôi có thể giúp gì cho bạn về nhật ký sản xuất, tiêu chuẩn VietGAP hay kỹ thuật canh tác nông nghiệp?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const suggestedQuestions = [
    'EBookFarm là gì?',
    'Tiêu chuẩn VietGAP cần lưu ý gì?',
    'Làm thế nào để truy xuất nguồn gốc sản phẩm?',
    'Trồng rau sạch cần bón phân thế nào?'
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    Keyboard.dismiss();
    const userMessage = {
      id: Date.now().toString(),
      text: query,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = messages
        .filter(m => m.id !== '1') // Bỏ tin nhắn chào mừng mặc định
        .map(m => ({
          type: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        }));

      const { data } = await api.post('/gemini/chat', {
        message: query,
        conversationHistory: history
      });

      let responseText = '';
      if (data.success) {
        responseText = data.data.response;
      } else {
        responseText = data.fallbackResponse || 'Xin lỗi, tôi không thể kết nối đến máy chủ AI vào lúc này.';
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      const fallback = error.response?.data?.fallbackResponse || 'Có lỗi kết nối xảy ra. Vui lòng kiểm tra lại mạng.';
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="cpu" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Feather name="cpu" size={24} color="#16a34a" />
        <Text style={styles.headerTitle}>Trợ lý AI Nông nghiệp</Text>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={
          loading && (
            <View style={styles.loadingRow}>
              <View style={styles.aiAvatar}>
                <Feather name="cpu" size={16} color="#fff" />
              </View>
              <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#16a34a" />
              </View>
            </View>
          )
        }
      />

      {/* Suggested Questions (only show when not loading and messages are short) */}
      {messages.length < 4 && !loading && (
        <View style={styles.suggestedContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedList}>
            {suggestedQuestions.map((q, idx) => (
              <TouchableOpacity key={idx} style={styles.suggestedItem} onPress={() => handleSend(q)}>
                <Text style={styles.suggestedText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nhập câu hỏi nông nghiệp..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()} disabled={loading}>
          <Feather name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 10,
  },
  messageList: {
    padding: 15,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#16a34a',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#1e293b',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  loadingBubble: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  suggestedContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
  },
  suggestedList: {
    paddingHorizontal: 15,
  },
  suggestedItem: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  suggestedText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1e293b',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  }
});
