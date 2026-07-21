import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NotificationDetailScreen from '../features/notifications/screens/NotificationDetailScreen';
import AccountInfoScreen from '../features/profile/screens/AccountInfoScreen';
import ChangePasswordScreen from '../features/profile/screens/ChangePasswordScreen';
import SettingsScreen from '../features/profile/screens/SettingsScreen';
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
    </Stack.Navigator>
  );
}
