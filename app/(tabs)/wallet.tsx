import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';

export default function WalletScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  useScreenRefresh({ inbox: true, intervalMs: 30000 });

  const unreadCount = useMemo(() => state.notifications.filter((item) => !item.read).length, [state.notifications]);
  const transactions = useMemo(
    () =>
      [...state.walletTransactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [state.walletTransactions]
  );

  const handleDeposit = () => {
    Alert.alert('Depot', 'Choisissez le montant a ajouter.', [
      { text: '5 000 F CFA', onPress: () => dispatch({ type: 'ADD_WALLET_TRANSACTION', mode: 'deposit', amount: 5000, method: 'Orange Money' }) },
      { text: '10 000 F CFA', onPress: () => dispatch({ type: 'ADD_WALLET_TRANSACTION', mode: 'deposit', amount: 10000, method: 'Orange Money' }) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleWithdraw = () => {
    if (state.cashoutBalance <= 0) {
      Alert.alert('Solde insuffisant', 'Votre solde est insuffisant pour effectuer un retrait.');
      return;
    }
    Alert.alert('Retrait', 'Choisissez le montant a retirer.', [
      {
        text: '5 000 F CFA',
        onPress: () => {
          if (state.cashoutBalance < 5000) {
            Alert.alert('Solde insuffisant', 'Votre solde actuel ne permet pas ce retrait.');
            return;
          }
          dispatch({ type: 'ADD_WALLET_TRANSACTION', mode: 'withdrawal', amount: 5000, method: 'Virement bancaire' });
        },
      },
      {
        text: '10 000 F CFA',
        onPress: () => {
          if (state.cashoutBalance < 10000) {
            Alert.alert('Solde insuffisant', 'Votre solde actuel ne permet pas ce retrait.');
            return;
          }
          dispatch({ type: 'ADD_WALLET_TRANSACTION', mode: 'withdrawal', amount: 10000, method: 'Virement bancaire' });
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.statusPill}>
            <TouchableOpacity
              style={[styles.statusOption, !state.availability && styles.statusOptionActive]}
              onPress={() => state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, !state.availability && styles.statusTextActive]}>
                Hors ligne
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, state.availability && styles.statusOptionActive]}
              onPress={() => !state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, state.availability && styles.statusTextActive]}>
                En ligne
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color={DriverColors.primary} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Solde du portefeuille</Text>
            <Ionicons name="chevron-forward" size={18} color={DriverColors.muted} />
          </View>
          <Text style={styles.balanceValue}>{Math.max(0, state.cashoutBalance).toLocaleString()} F CFA</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeposit}>
              <Ionicons name="add" size={16} color={DriverColors.primary} />
              <Text style={styles.actionText}>Depot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
              <Ionicons name="arrow-down" size={16} color={DriverColors.primary} />
              <Text style={styles.actionText}>Retrait</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique des transactions</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptyText}>Vos gains, depots et retraits seront affiches ici.</Text>
          </View>
        ) : (
          transactions.map((item) => (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Ionicons
                  name={item.amount < 0 ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={item.amount < 0 ? DriverColors.danger : DriverColors.primary}
                />
              </View>
              <View style={styles.transactionBody}>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                <Text style={styles.transactionDate}>{item.date}</Text>
              </View>
              <Text style={[styles.transactionAmount, item.amount < 0 && styles.transactionAmountNegative]}>
                {item.amount > 0 ? '+' : ''}
                {item.amount.toLocaleString()} F CFA
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  content: {
    padding: DriverSpacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.lg,
  },
  statusPill: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 999,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusOptionActive: {
    backgroundColor: DriverColors.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.muted,
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.lg,
    borderWidth: 1,
    borderColor: DriverColors.border,
    padding: DriverSpacing.lg,
    marginBottom: DriverSpacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: DriverColors.text,
    marginTop: 6,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: DriverSpacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.text,
  },
  sectionHeader: {
    marginBottom: DriverSpacing.sm,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  emptyCard: {
    padding: DriverSpacing.lg,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  emptyText: {
    fontSize: 12,
    color: DriverColors.muted,
    textAlign: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.sm,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  transactionBody: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  transactionDate: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  transactionAmountNegative: {
    color: DriverColors.danger,
  },
});
