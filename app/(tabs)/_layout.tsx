import React from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Radius } from '../../src/theme';

const { width } = Dimensions.get('window');

// Sıralama: Çeklerim | Bildirimler | Çek Koparma | Arkadaşlar | Profil
const TABS = [
  { name: 'coupons',       label: 'Çeklerim',  icon: '🎫' },
  { name: 'notifications', label: 'Bildirimler', icon: '🔔' },
  { name: 'home',          label: '',           icon: 'P',  isCenter: true },
  { name: 'friends',       label: 'Arkadaşlar', icon: '👥' },
  { name: 'profile',       label: 'Profil',     icon: '👤' },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab, i) => {
        const route  = state.routes.find((r: any) => r.name === tab.name);
        const idx    = state.routes.indexOf(route);
        const active = state.index === idx;

        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={styles.centerBtn}
              activeOpacity={0.85}
            >
              <View style={[styles.centerInner, active && styles.centerInnerActive]}>
                <Text style={styles.centerIcon}>{tab.icon}</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <Text style={styles.tabIcon}>{tab.icon}</Text>
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="coupons"       />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="home"          />
      <Tabs.Screen name="friends"       />
      <Tabs.Screen name="profile"       />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    paddingTop:      8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            3,
  },
  tabIconWrap: {
    width:          40,
    height:         36,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: Colors.yellow },
  tabIcon:           { fontSize: 18 },
  tabLabel: {
    fontFamily: Typography.fontBody,
    fontSize:   10,
    color:      Colors.tabIcon,
  },
  tabLabelActive: { color: Colors.tabIconActive, fontFamily: Typography.fontBodyMed },

  // Orta buton
  centerBtn: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      -20,
  },
  centerInner: {
    width:           58,
    height:          58,
    borderRadius:    29,
    backgroundColor: Colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.brand,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.35,
    shadowRadius:    12,
    elevation:       8,
  },
  centerInnerActive: { backgroundColor: Colors.brandLight },
  centerIcon: {
    fontFamily: Typography.fontBrand,
    fontSize:   26,
    color:      '#fff',
    lineHeight: 32,
  },
});
