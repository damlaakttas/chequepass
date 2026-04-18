// src/components/ScreenHeader.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { ChevronDown, Users } from 'lucide-react-native';
import AppLogo from './AppLogo';
import AnimalAvatar from './AnimalAvatar';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';

const ScreenHeader = ({ title, showFriendSwitcher = true, rightAction = null }) => {
  const { friends, activeFriend, setActiveFriend } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <AppLogo size="md" />
      <View style={styles.right}>
        {showFriendSwitcher && friends.length > 0 && (
          <TouchableOpacity
            style={styles.switcher}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.8}
          >
            {activeFriend ? (
              <>
                <AnimalAvatar type={activeFriend.avatar} size={26} />
                <Text style={styles.switcherText} numberOfLines={1}>
                  @{activeFriend.username}
                </Text>
              </>
            ) : (
              <>
                <Users size={18} color={COLORS.text} />
                <Text style={styles.switcherText}>Seç</Text>
              </>
            )}
            <ChevronDown size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        {rightAction}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Arkadaş Seç</Text>
            <Text style={styles.modalSub}>
              Seçtiğin kişiye göre tüm çekler ve istatistikler değişir.
            </Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {friends.map((f) => {
                const active = f.id === activeFriend?.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.friendRow, active && styles.friendRowActive]}
                    onPress={() => {
                      setActiveFriend(f.id);
                      setPickerOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <AnimalAvatar type={f.avatar} size={42} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.friendName}>@{f.username}</Text>
                      <Text style={styles.friendRelation}>
                        {f.relation === 'partner' ? 'Sevgili' : 'Arkadaş'}
                      </Text>
                    </View>
                    {active && <View style={styles.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    maxWidth: 160,
    ...SHADOW.soft,
  },
  switcherText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
    maxWidth: 70,
  },
  modalBg: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: COLORS.text,
  },
  modalSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    marginBottom: 6,
  },
  friendRowActive: {
    backgroundColor: COLORS.primary + '30',
  },
  friendName: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
  },
  friendRelation: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryDark,
  },
});

export default ScreenHeader;
