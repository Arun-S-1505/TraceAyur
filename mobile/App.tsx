import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import CollectorScreen from "./src/screens/CollectorScreen";
import ConsumerScreen from "./src/screens/ConsumerScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    // @ts-ignore - NavigationContainer children detection issue
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#2e7d32",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
          },
        }}
      >
        <Tab.Screen
          name="Collector"
          component={CollectorScreen}
          options={{
            title: "Collect",
            headerStyle: { backgroundColor: "#e8f5e8" },
            headerTitleStyle: { color: "#2e7d32", fontWeight: "bold" },
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Text style={{ color, fontSize: size - 4 }}>🌾</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Consumer"
          component={ConsumerScreen}
          options={{
            title: "Scan QR",
            headerStyle: { backgroundColor: "#e3f2fd" },
            headerTitleStyle: { color: "#1976d2", fontWeight: "bold" },
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Text style={{ color, fontSize: size - 4 }}>📱</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
