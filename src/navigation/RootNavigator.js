// src/navigation/RootNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FileText, Bell, Users, User, Sparkles } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import ChequesScreen from '../screens/ChequesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import FriendsScreen from '../screens/FriendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';

import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/theme';
import { useApp } from '../context/AppContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ---- Custom Bottom Tab Bar ---------------------------------------------------
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { unreadCount } = useApp();

  // Sıra: Çeklerim, Bildirimler, [Home/Çek Kopar], Arkadaşlar, Profil
  const ORDERED = ['Cheques', 'Notifications', 'Home', 'Friends', 'Profile'];
  const iconMap = {
    Cheques: FileText,
    Notifications: Bell,
    Friends: Users,
    Profile: User,
  };
  const labelMap = {
    Cheques: 'Çeklerim',
    Notifications: 'Bildirimler',
    Friends: 'Arkadaşlar',
    Profile: 'Profilim',
  };

  return (
    <View style={styles.tabBarWrap}>
      <View style={styles.tabBar}>
        {ORDERED.map((name) => {
          const routeIndex = state.routes.findIndex((r) => r.name === name);
          if (routeIndex === -1) return null;
          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // CENTER HOME BUTTON
          if (name === 'Home') {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={styles.centerWrap}
              >
                <View style={[styles.centerBtn, isFocused && styles.centerBtnFocused]}>
                  <Sparkles size={26} color={COLORS.text} />
                </View>
                <Text style={[styles.centerLabel, isFocused && { color: COLORS.text }]}>
                  Kopart
                </Text>
              </TouchableOpacity>
            );
          }

          const Icon = iconMap[name];
          const showBadge = name === 'Notifications' && unreadCount > 0;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View style={styles.iconWrap}>
                <Icon
                  size={20}
                  color={isFocused ? COLORS.text : COLORS.textLight}
                  strokeWidth={isFocused ? 2.4 : 2}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
                {labelMap[name]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    initialRouteName="Home"
  >
    <Tab.Screen name="Cheques" component={ChequesScreen} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Friends" component={FriendsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { user } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.medium,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  iconWrap: { position: 'relative' },
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#fff',
  },
  centerWrap: {
    flex: 1.1,
    alignItems: 'center',
    marginTop: -28,
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.surface,
    ...SHADOW.strong,
  },
  centerBtnFocused: {
    backgroundColor: COLORS.secondary,
  },
  centerLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

export default RootNavigator;
