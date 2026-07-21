import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';

import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import MyTasksScreen from '../features/production/screens/MyTasksScreen';
import PlansAndLogsScreen from '../features/production/screens/PlansAndLogsScreen';
import LandPlotsScreen from '../features/production/screens/LandPlotsScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import api from '../shared/api/client';
import { extractItems, unwrapPayload } from '../shared/api/response';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'PlansAndLogs', label: 'Kế hoạch', icon: 'book-open', component: PlansAndLogsScreen },
  { name: 'MyTasks', label: 'Công việc', icon: 'check-square', component: MyTasksScreen },
  { name: 'Notifications', label: 'Thông báo', icon: 'bell', component: NotificationsScreen },
  { name: 'LandPlots', label: 'Vùng trồng', icon: 'map', component: LandPlotsScreen },
  { name: 'Profile', label: 'Cá nhân', icon: 'user', component: ProfileScreen },
];

export default function MainTabNavigator() {
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread');
      const payload = unwrapPayload(response.data);
      const items = extractItems(response.data);

      if (Array.isArray(payload)) return payload.length;
      if (items.length) return items.length;
      return Number(payload?.unreadCount ?? payload?.count ?? payload?.totalItems ?? 0);
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
  const unreadCount = Number.isFinite(unreadQuery.data) ? unreadQuery.data : 0;

  return (
    <Tab.Navigator
      initialRouteName="PlansAndLogs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const tab = TABS.find((item) => item.name === route.name);
          return <Feather name={tab?.icon || 'circle'} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 72,
          paddingBottom: 18,
          paddingTop: 7,
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarBadge: tab.name === 'Notifications' && unreadCount > 0
              ? (unreadCount > 99 ? '99+' : unreadCount)
              : undefined,
            tabBarBadgeStyle: tab.name === 'Notifications'
              ? { backgroundColor: '#dc2626', color: '#fff', fontSize: 10, fontWeight: '900' }
              : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
