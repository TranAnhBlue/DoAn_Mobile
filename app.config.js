import 'dotenv/config';

export default {
  expo: {
    name: "EAPLS Mobile",
    slug: "eapls-mobile",
    owner: "trananhblue",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "eapls",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "vn.io.eapls.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#ffffff"
      },
      package: "vn.io.eapls.mobile"
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#ffffff",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200
        }
      ],
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "Cho phép $(PRODUCT_NAME) sử dụng microphone để nhận dạng giọng nói.",
          "speechRecognitionPermission": "Cho phép $(PRODUCT_NAME) nhận dạng giọng nói của bạn."
        }
      ]
    ],
    extra: {
      apiUrl: process.env.VITE_API_URL || process.env.VITE_API_ROOT || 'https://api.eapls.io.vn/api',
      googleClientId: process.env.VITE_GOOGLE_CLIENT_ID,
      googleSttApiKey: process.env.GOOGLE_STT_API_KEY || '',
      eas: {
        projectId: "980da3ad-6cfc-48a7-afa2-b2496475dfee"
      }
    }
  }
};
