import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NotificationDetailScreen from '../features/notifications/screens/NotificationDetailScreen';
import AccountInfoScreen from '../features/profile/screens/AccountInfoScreen';
import ChangePasswordScreen from '../features/profile/screens/ChangePasswordScreen';
import SettingsScreen from '../features/profile/screens/SettingsScreen';
import SupervisorPlanDetailScreen from '../roles/farm-supervisor/screens/SupervisorPlanDetailScreen.js';
import FarmerDetailScreen from '../roles/farm-supervisor/screens/FarmerDetailScreen.js';
import LandPlotDetailScreen from '../roles/farm-supervisor/screens/LandPlotDetailScreen.js';
import SupervisorTaskDetailScreen from '../roles/farm-supervisor/screens/SupervisorTaskDetailScreen.js';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function AuthenticatedNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="SupervisorPlanDetail" component={SupervisorPlanDetailScreen} />
      <Stack.Screen name="SupervisorTaskDetail" component={SupervisorTaskDetailScreen} />
      <Stack.Screen name="FarmerDetail" component={FarmerDetailScreen} />
      <Stack.Screen name="LandPlotDetail" component={LandPlotDetailScreen} />
    </Stack.Navigator>
  );
}
