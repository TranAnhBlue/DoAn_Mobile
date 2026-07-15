import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import SupervisorHomeScreen from '../screens/supervisor/SupervisorHomeScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import PlaceholderScreen from '../screens/shared/PlaceholderScreen';

const Stack = createNativeStackNavigator();

const PLACEHOLDER_SCREENS = [
  {name: 'Weather', title: 'Thời tiết'},
  {name: 'AssignedLand', title: 'Vùng trồng'},
  {name: 'WorkPlan', title: 'Kế hoạch công việc'},
  {name: 'DailyReport', title: 'Báo cáo hàng ngày'},
  {name: 'FieldDiary', title: 'Nhật ký đồng'},
  {name: 'SeasonManagement', title: 'Quản lý vùng trồng'},
  {name: 'PlanManagement', title: 'Quản lý kế hoạch'},
  {name: 'ReportManagement', title: 'Quản lý báo cáo'},
  {name: 'FarmerManagement', title: 'Quản lý nông dân'},
  {name: 'Analytics', title: 'Thống kê'},
];

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="FarmerHome" component={FarmerHomeScreen} />
        <Stack.Screen name="SupervisorHome" component={SupervisorHomeScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />

        {PLACEHOLDER_SCREENS.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={PlaceholderScreen}
            initialParams={{title: screen.title}}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
