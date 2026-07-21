import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AIScreen from '../features/ai/screens/AIScreen';
import { useAuthStore } from '../features/auth/store/authStore';
import { isFarmer } from '../features/auth/utils/roles';
import HomeScreen from '../features/dashboard/screens/HomeScreen';
import JournalListScreen from '../features/journals/screens/JournalListScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import ScannerScreen from '../features/traceability/screens/ScannerScreen';

const Tab = createBottomTabNavigator();

const TAB_ICON = {
  Home: 'home',
  Journals: 'book',
  Scanner: 'grid',
  AI: 'cpu',
  Profile: 'user',
};

const TAB_LABEL = {
  Home: 'Trang chủ',
  Journals: 'Nhật ký',
  Scanner: 'Truy xuất',
  AI: 'Hỏi AI',
  Profile: 'Tài khoản',
};

export default function MainTabNavigator() {
  const user = useAuthStore((state) => state.user);
  const farmerMode = isFarmer(user?.role || user?.roles?.[0]);
  const tabs = farmerMode
    ? [
        { name: 'Home', component: HomeScreen },
        { name: 'Journals', component: JournalListScreen },
        { name: 'Scanner', component: ScannerScreen },
        { name: 'Profile', component: ProfileScreen },
      ]
    : [
        { name: 'Home', component: HomeScreen },
        { name: 'Journals', component: JournalListScreen },
        { name: 'Scanner', component: ScannerScreen },
        { name: 'AI', component: AIScreen },
        { name: 'Profile', component: ProfileScreen },
      ];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const hiddenTab = route.name === 'Journals';
        return {
          headerShown: false,
          tabBarButton: hiddenTab ? () => null : undefined,
          tabBarItemStyle: hiddenTab ? { display: 'none' } : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name={TAB_ICON[route.name]} size={size} color={color} />
          ),
          tabBarActiveTintColor: '#16a34a',
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
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}
