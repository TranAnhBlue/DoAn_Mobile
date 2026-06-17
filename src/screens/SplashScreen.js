import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide status bar
    StatusBar.setHidden(true);

    // Animation sequence
    const animationSequence = Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Text animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(1000),
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      StatusBar.setHidden(false);
      onFinish();
    });

    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#22c55e', '#16a34a', '#15803d']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar hidden />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.patternDot,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.1],
                }),
              },
            ]}
          />
        ))}
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoBackground,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.logoInner}>
              <Image 
                source={require('../../assets/images/Logo_EBookFarm.jpg')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>EBookFarm</Text>
          <Text style={styles.tagline}>Nông nghiệp số</Text>
          <Text style={styles.subtitle}>Quản lý nhật ký sản xuất thông minh</Text>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingBar}>
            <Animated.View
              style={[
                styles.loadingFill,
                {
                  transform: [{
                    scaleX: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    })
                  }]
                },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Đang khởi tạo...</Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom Branding */}
      <Animated.View
        style={[
          styles.bottomBranding,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.brandingText}>Powered by EBookFarm Team</Text>
        <Text style={styles.versionText}>Version 1.2.0</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    width: 200,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    transformOrigin: 'left',
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  brandingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});