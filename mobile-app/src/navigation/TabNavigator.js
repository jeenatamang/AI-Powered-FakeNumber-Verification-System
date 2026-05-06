// mobile-app/src/navigation/TabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import HomeScreen        from '../screens/HomeScreen';
import SearchScreen      from '../screens/SearchScreen';
import SmsAnalyzerScreen from '../screens/SmsAnalyzerScreen';
import MessagesScreen    from '../screens/MessagesScreen';
import CallScreen        from '../screens/CallScreen';

const Tab = createBottomTabNavigator();
const COLORS = { accent: '#3B6FE8', sub: '#94A3B8' };

export default function TabNavigator() {
  const { hasPermission } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: COLORS.sub,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 16,
          shadowOpacity: 0.08,
          height: 62,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:        focused ? 'home'        : 'home-outline',
            Search:      focused ? 'search'      : 'search-outline',
            Messages:    focused ? 'chatbubbles' : 'chatbubbles-outline',
            Calls:       focused ? 'call'        : 'call-outline',
            SmsAnalyzer: focused ? 'scan'        : 'scan-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      {hasPermission && <Tab.Screen name="Messages" component={MessagesScreen} />}
      {hasPermission && <Tab.Screen name="Calls"    component={CallScreen} />}
      {hasPermission && (
        <Tab.Screen
          name="SmsAnalyzer"
          component={SmsAnalyzerScreen}
          options={{ tabBarLabel: 'Analyze' }}
        />
      )}
    </Tab.Navigator>
  );
}