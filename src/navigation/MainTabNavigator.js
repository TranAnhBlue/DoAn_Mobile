import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../features/auth/store/authStore';
import { isFarmSupervisor } from '../features/auth/utils/roles';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import FarmersScreen from '../roles/farm-supervisor/screens/FarmersScreen';
import SupervisorPlansScreen from '../roles/farm-supervisor/screens/SupervisorPlansScreen';
import LandPlotsScreen from '../roles/farm-leader/screens/LandPlotsScreen';
import MyTasksScreen from '../roles/farm-leader/screens/MyTasksScreen';
import api from '../shared/api/client';
import { extractItems, unwrapPayload } from '../shared/api/response';

const Tab = createBottomTabNavigator();

const LEADER_TABS = [
  { name: 'MyTasks', label: 'Công việc', icon: 'check-square', component: MyTasksScreen },
  { name: 'Notifications', label: 'Thông báo', icon: 'bell', component: NotificationsScreen },
  { name: 'Profile', label: 'Cá nhân', icon: 'user', component: ProfileScreen },
];

const SUPERVISOR_TABS = [
  { name: 'SupervisorPlans', label: 'Kế hoạch', icon: 'book-open', component: SupervisorPlansScreen },
  { name: 'Farmers', label: 'Nông dân', icon: 'users', component: FarmersScreen },
  { name: 'LandPlots', label: 'Vùng trồng', icon: 'map', component: LandPlotsScreen },
  { name: 'Notifications', label: 'Thông báo', icon: 'bell', component: NotificationsScreen },
  { name: 'Profile', label: 'Cá nhân', icon: 'user', component: ProfileScreen },
];

const checkIsFarmSupervisor = (role) => {
  if (typeof isFarmSupervisor === 'function') return isFarmSupervisor(role);
  const normalized = String(role || '').toUpperCase();
  return normalized === 'FARM_SUPERVISOR' || normalized === 'SUPERVISOR';
};

export default function MainTabNavigator() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || user?.roles?.[0];
  const supervisorMode = checkIsFarmSupervisor(userRole);
  const tabs = supervisorMode ? SUPERVISOR_TABS : LEADER_TABS;

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
      initialRouteName={supervisorMode ? 'SupervisorPlans' : 'MyTasks'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const tab = tabs.find((item) => item.name === route.name);
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
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          textAlign: 'center',
        },
      })}
    >
      {tabs.map((tab) => (
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
