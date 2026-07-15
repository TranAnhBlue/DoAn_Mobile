import Icon from 'react-native-vector-icons/Feather';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAuthStore } from './src/store/authStore';
import { initializeDatabase } from './src/database/schema';
import syncManager from './src/services/syncManager';

// Create a client
const queryClient = new QueryClient();



// Auth
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

// Main Tabs
import HomeScreen from './src/screens/HomeScreen';
import FarmerHomeScreen from './src/screens/FarmerHomeScreen';
import SupervisorHomeScreen from './src/screens/SupervisorHomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import JournalListScreen from './src/screens/JournalListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportsScreen from './src/screens/ReportsScreen';

// Farmer Screens
import CreatePurchaseRequisitionScreen from './src/screens/CreatePurchaseRequisitionScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import ProductBatchDetailScreen from './src/screens/ProductBatchDetailScreen';
import ProductBatchesScreen from './src/screens/ProductBatchesScreen';
import ProductionPlanDetailScreen from './src/screens/ProductionPlanDetailScreen';
import ProductionPlansScreen from './src/screens/ProductionPlansScreen';
import PurchaseRequisitionsScreen from './src/screens/PurchaseRequisitionsScreen';

// Stack Screens
import AIScreen from './src/screens/AIScreen';
import AccountInfoScreen from './src/screens/AccountInfoScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import JournalEntryScreen from './src/screens/JournalEntryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProductionTechScreen from './src/screens/ProductionTechScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TraceDetailScreen from './src/screens/TraceDetailScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICON = {
  Home:     'home',
  Journals: 'book',
  Scanner:  'grid',
  AI:       'cpu',
  Profile:  'user',
};

const TAB_LABEL = {
  Home:     'Trang chủ',
  Journals: 'Nhật ký',
  Scanner:  'Truy xuất',
  AI:       'Hỏi AI',
  Profile:  'Tài khoản',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const hiddenTab = route.name === 'Journals' || route.name === 'AI';
        return {
          headerShown: false,
          tabBarButton: hiddenTab ? () => null : undefined,
          tabBarItemStyle: hiddenTab ? { display: 'none' } : undefined,
          tabBarIcon: ({ color, size }) => (
            <Icon name={TAB_ICON[route.name]} size={size} color={color} />
          ),
          tabBarActiveTintColor:   '#16a34a',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabel: TAB_LABEL[route.name],
          tabBarStyle: {
            height: 72,
            paddingBottom: 20,
            paddingTop: 5,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        };
      }}
    >
      <Tab.Screen name="Home"     component={HomeComponent}        />
      <Tab.Screen name="Journals" component={JournalListScreen} />
      <Tab.Screen name="Scanner"  component={ScannerScreen}     />
      <Tab.Screen name="AI"       component={AIScreen}          />
      <Tab.Screen name="Profile"  component={ProfileScreen}     />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, isLoading, initialize } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Initializing app...');
        
        await initializeDatabase();
        console.log('✅ Database initialized');
        
        await initialize();
        console.log('✅ Auth initialized');
        
        syncManager.initialize();
        console.log('✅ Sync manager initialized');
        
        setAppReady(true);
      } catch (e) {
        console.error('❌ App initialization failed:', e);
        setAppReady(true);
      }
    }

    prepare();

    return () => {
      syncManager.destroy();
    };
  }, []);

  if (!appReady || isLoading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const userRole = user?.role || '';
  let HomeComponent = HomeScreen;
  
  if (userRole === 'FARMER' || userRole === 'Farmer') {
    HomeComponent = FarmerHomeScreen;
  } else if (userRole === 'FARM_SUPERVISOR' || userRole === 'Supervisor') {
    HomeComponent = SupervisorHomeScreen;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Inventory"
                component={InventoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TraceDetail"
                component={TraceDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AccountInfo"
                component={AccountInfoScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="JournalEntry"
                component={JournalEntryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductionTech"
                component={ProductionTechScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductionPlans"
                component={ProductionPlansScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductionPlanDetail"
                component={ProductionPlanDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductBatches"
                component={ProductBatchesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductBatchDetail"
                component={ProductBatchDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MyTasks"
                component={MyTasksScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PurchaseRequisitions"
                component={PurchaseRequisitionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CreatePurchaseRequisition"
                component={CreatePurchaseRequisitionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Equipment"
                component={EquipmentScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPasswordScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
