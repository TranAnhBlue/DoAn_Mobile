import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AIScreen from '../features/ai/screens/AIScreen';
import { useAuthStore } from '../features/auth/store/authStore';
import { isFarmer } from '../features/auth/utils/roles';
import InventoryScreen from '../features/inventory/screens/InventoryScreen';
import JournalEntryScreen from '../features/journals/screens/JournalEntryScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import EquipmentScreen from '../features/production/screens/EquipmentScreen';
import MyTasksScreen from '../features/production/screens/MyTasksScreen';
import ProductBatchDetailScreen from '../features/production/screens/ProductBatchDetailScreen';
import ProductBatchesScreen from '../features/production/screens/ProductBatchesScreen';
import ProductionPlanDetailScreen from '../features/production/screens/ProductionPlanDetailScreen';
import ProductionPlansScreen from '../features/production/screens/ProductionPlansScreen';
import ProductionTechScreen from '../features/production/screens/ProductionTechScreen';
import AccountInfoScreen from '../features/profile/screens/AccountInfoScreen';
import ChangePasswordScreen from '../features/profile/screens/ChangePasswordScreen';
import SettingsScreen from '../features/profile/screens/SettingsScreen';
import CreatePurchaseRequisitionScreen from '../features/purchases/screens/CreatePurchaseRequisitionScreen';
import PurchaseRequisitionsScreen from '../features/purchases/screens/PurchaseRequisitionsScreen';
import ReportsScreen from '../features/reports/screens/ReportsScreen';
import ScannerScreen from '../features/traceability/screens/ScannerScreen';
import TraceDetailScreen from '../features/traceability/screens/TraceDetailScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function AuthenticatedNavigator() {
  const user = useAuthStore((state) => state.user);
  const farmerMode = isFarmer(user?.role || user?.roles?.[0]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="TraceDetail" component={TraceDetailScreen} />
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
      <Stack.Screen name="ProductionTech" component={ProductionTechScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ProductionPlans" component={ProductionPlansScreen} />
      <Stack.Screen name="ProductionPlanDetail" component={ProductionPlanDetailScreen} />
      <Stack.Screen name="ProductBatches" component={ProductBatchesScreen} />
      <Stack.Screen name="ProductBatchDetail" component={ProductBatchDetailScreen} />
      <Stack.Screen name="MyTasks" component={MyTasksScreen} />

      {!farmerMode && (
        <Stack.Group>
          <Stack.Screen name="Inventory" component={InventoryScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="PurchaseRequisitions" component={PurchaseRequisitionsScreen} />
          <Stack.Screen name="CreatePurchaseRequisition" component={CreatePurchaseRequisitionScreen} />
          <Stack.Screen name="Equipment" component={EquipmentScreen} />
          <Stack.Screen name="AI" component={AIScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
