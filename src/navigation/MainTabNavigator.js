import { Feather } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import NotificationsScreen from "../features/notifications/screens/NotificationsScreen";
import LandPlotsScreen from "../features/production/screens/LandPlotsScreen";
import MyTasksScreen from "../features/production/screens/MyTasksScreen";
import PlansAndLogsScreen from "../features/production/screens/PlansAndLogsScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const TABS = [
  {
    name: "PlansAndLogs",
    label: "Kế hoạch\n& Ghi chép",
    icon: "edit",
    component: PlansAndLogsScreen,
  },
  {
    name: "MyTasks",
    label: "Công việc",
    icon: "check-square",
    component: MyTasksScreen,
  },
  {
    name: "Notifications",
    label: "Thông báo",
    icon: "bell",
    component: NotificationsScreen,
  },
  {
    name: "LandPlots",
    label: "Vùng trồng",
    icon: "map",
    component: LandPlotsScreen,
  },
  { name: "Profile", label: "Cá nhân", icon: "user", component: ProfileScreen },
];

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="PlansAndLogs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const tab = TABS.find((item) => item.name === route.name);
          return (
            <Feather name={tab?.icon || "circle"} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: "#15803d",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          height: 72,
          paddingBottom: 18,
          paddingTop: 7,
          backgroundColor: "#fff",
          borderTopColor: "#e2e8f0",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          textAlign: "center",
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}
