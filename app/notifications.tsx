import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

const toRelativeTime = (iso: string) => {
  const createdAt = new Date(iso).getTime();
  const diffMin = Math.max(1, Math.floor((Date.now() - createdAt) / 60000));
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Il y a ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `Il y a ${diffDay} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      paddingHorizontal: DriverSpacing.lg,
      paddingTop: DriverSpacing.md,
      paddingBottom: DriverSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.iconButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...DriverTypography.section,
      color: palette.text,
    },
    clearButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.iconButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryBar: {
      paddingHorizontal: DriverSpacing.lg,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryText: {
      fontSize: 12,
      color: palette.textMuted,
      fontWeight: '600',
    },
    summaryAction: {
      fontSize: 12,
      color: DriverColors.primary,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: DriverSpacing.lg,
      paddingBottom: DriverSpacing.lg,
      gap: DriverSpacing.md,
    },
    emptyCard: {
      borderRadius: DriverRadius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      padding: DriverSpacing.lg,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
    },
    emptyBody: {
      fontSize: 12,
      color: palette.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    card: {
      padding: DriverSpacing.md,
      borderRadius: DriverRadius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    cardUnread: {
      borderColor: palette.primaryBorder,
      backgroundColor: palette.primaryMuted,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: DriverColors.primary,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
    },
    cardTime: {
      fontSize: 11,
      color: palette.textMuted,
    },
    cardBody: {
      fontSize: 12,
      color: palette.textMuted,
      lineHeight: 18,
    },
  });
  useScreenRefresh({ inbox: true, intervalMs: 20000 });

  const notifications = useMemo(
    () =>
      [...state.notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [state.notifications]
  );
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.clearButton} onPress={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}>
          <Ionicons name="checkmark-done" size={18} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{unreadCount} non lue(s)</Text>
        <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}>
          <Text style={styles.summaryAction}>Effacer tout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={20} color={palette.textMuted} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyBody}>Les alerts de solde, depots, retraits et mises a jour apparaitront ici.</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const iconName =
              item.kind === 'earning'
                ? 'cash-outline'
                : item.kind === 'deposit'
                  ? 'arrow-up-circle-outline'
                  : item.kind === 'withdrawal'
                    ? 'arrow-down-circle-outline'
                    : 'information-circle-outline';
            const iconColor =
              item.kind === 'earning'
                ? DriverColors.success
                : item.kind === 'withdrawal'
                  ? DriverColors.danger
                  : DriverColors.primary;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => dispatch({ type: 'MARK_NOTIFICATION_READ', id: item.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name={iconName as any} size={16} color={iconColor} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {!item.read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.cardTime}>{toRelativeTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
