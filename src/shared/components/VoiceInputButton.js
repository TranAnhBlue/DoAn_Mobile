/**
 * VoiceInputButton — hoạt động trên Expo Go
 *
 * Cách hoạt động:
 *  1. Dùng expo-av để ghi âm (hỗ trợ Expo Go không cần native build)
 *  2. Khi dừng ghi, convert audio → base64
 *  3. Gửi lên Google Speech-to-Text REST API
 *  4. Nhận transcript → điền vào TextInput
 *
 * Cần: GOOGLE_STT_API_KEY trong .env (xem README để lấy miễn phí)
 *
 * Props:
 *  - onResult(text: string)     — gọi khi nhận được transcript cuối
 *  - onPartialResult(text)      — không dùng trong mode này (REST API)
 *  - disabled?: boolean
 *  - style?: ViewStyle
 */
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

// Đọc key từ app.config.js → extra.googleSttApiKey
// Hoặc set trực tiếp ở đây để test nhanh (không nên commit lên git)
const GOOGLE_STT_API_KEY =
  Constants.expoConfig?.extra?.googleSttApiKey ||
  process.env.GOOGLE_STT_API_KEY ||
  '';

// Cấu hình ghi âm — LINEAR16 16kHz hoạt động tốt nhất với Google STT
const RECORDING_OPTIONS = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

export default function VoiceInputButton({ onResult, disabled = false, style }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);

  function startPulse() {
    pulseAnim.setValue(1);
    ringOpacity.setValue(0.55);
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.9,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(150),
      ])
    );
    pulseLoopRef.current.start();
  }

  function stopPulse() {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;
    pulseAnim.setValue(1);
    ringOpacity.setValue(0);
  }

  const startRecording = async () => {
    // Kiểm tra có API key chưa
    if (!GOOGLE_STT_API_KEY) {
      Alert.alert(
        'Chưa cấu hình API Key',
        'Cần thêm GOOGLE_STT_API_KEY vào file .env.\n\nXem hướng dẫn trong README hoặc hỏi admin để lấy key miễn phí.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Xin quyền microphone
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền Microphone',
          'Vui lòng cấp quyền microphone trong Cài đặt thiết bị.'
        );
        return;
      }

      // Thiết lập audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Bắt đầu ghi âm
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setIsRecording(true);
      startPulse();
    } catch (err) {
      console.warn('[VoiceInputButton] Lỗi bắt đầu ghi:', err?.message);
      Alert.alert('Không thể ghi âm', `${err?.message || 'Vui lòng thử lại.'}`);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setIsRecording(false);
    stopPulse();
    setIsProcessing(true);
    recordingRef.current = null;

    try {
      // Dừng ghi âm
      await recording.stopAndUnloadAsync();

      // Khôi phục audio session về chế độ phát
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recording.getURI();
      if (!uri) throw new Error('Không lấy được file audio.');

      // Đọc file audio → base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Gọi Google Speech-to-Text REST API
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: 'vi-VN',
              alternativeLanguageCodes: ['en-US'],
              enableAutomaticPunctuation: true,
              model: 'default',
            },
            audio: {
              content: base64Audio,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData?.error?.message || `HTTP ${response.status}`;
        throw new Error(message);
      }

      const data = await response.json();
      const transcript = data?.results?.[0]?.alternatives?.[0]?.transcript;

      if (transcript) {
        onResult?.(transcript.trim());
      } else {
        Alert.alert('Không nhận được giọng nói', 'Hãy nói rõ hơn rồi thử lại.');
      }

      // Xoá file tạm
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    } catch (err) {
      console.warn('[VoiceInputButton] Lỗi nhận dạng:', err?.message);
      if (err?.message?.includes('API key')) {
        Alert.alert(
          'API Key không hợp lệ',
          'Kiểm tra lại GOOGLE_STT_API_KEY trong file .env.'
        );
      } else {
        Alert.alert('Lỗi nhận dạng giọng nói', `${err?.message || 'Vui lòng thử lại.'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePress = async () => {
    if (isProcessing) return; // Đang xử lý, bỏ qua
    if (isRecording) {
      await stopRecordingAndTranscribe();
    } else {
      await startRecording();
    }
  };

  // Không render trên web
  if (Platform.OS === 'web') return null;


  return (
    <View style={[styles.wrapper, style]}>
      {/* Vòng sóng pulse khi đang ghi */}
      {isRecording && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: ringOpacity,
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isProcessing}
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          isProcessing && styles.buttonProcessing,
          disabled && styles.buttonDisabled,
        ]}
        activeOpacity={0.75}
        hitSlop={8}
      >
        <Feather
          name={
            isProcessing ? 'loader' :
            isRecording ? 'mic-off' :
            'mic'
          }
          size={17}
          color={
            isProcessing ? '#7c3aed' :
            isRecording ? '#fff' :
            disabled ? '#94a3b8' :
            '#15803d'
          }
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dc2626',
  },
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  buttonProcessing: {
    backgroundColor: '#f3e8ff',
    borderColor: '#7c3aed',
  },
  buttonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
});
