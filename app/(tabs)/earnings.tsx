import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const weeklyMock = [4500, 7200, 3800, 9100, 5400, 6700, 8200];

export default function EarningsScreen() {
  const { state } = useDriverStore();

  const totalWeek = useMemo(() => weeklyMock.reduce((sum, value) => sum + value, 0), []);
  const maxValue = Math.max(...weeklyMock);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Gains</Text>
            <Text style={styles.subtitle}>Suivi des revenus et paiements.</Text>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="download" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Solde disponible</Text>
          <Text style={styles.heroValue}>{state.cashoutBalance.toLocaleString()} F CFA</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Ionicons name="calendar" size={14} color={DriverColors.accent} />
              <Text style={styles.heroChipText}>Semaine: {totalWeek.toLocaleString()} F</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="wallet" size={14} color={DriverColors.secondary} />
              <Text style={styles.heroChipText}>Paiement en attente</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Demander un retrait</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance hebdomadaire</Text>
          <Text style={styles.sectionMeta}>7 derniers jours</Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartRow}>
            {weeklyMock.map((value, index) => {
              const height = Math.max(22, (value / maxValue) * 120);
              return (
                <View key={`${value}-${index}`} style={styles.barWrap}>
                  <View style={[styles.bar, { height }]} />
                  <Text style={styles.barLabel}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'][index]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique r\u00e9cent</Text>
          <Text style={styles.sectionMeta}>Mises \u00e0 jour</Text>
        </View>

        {[
          { title: 'Paiement mobile money', amount: 12000, date: "Aujourd'hui" },
          { title: 'Bonus disponibilit\u00e9', amount: 3000, date: 'Hier' },
          { title: 'Retrait effectu\u00e9', amount: -8000, date: '12 mars' },
        ].map((item, index) => (
          <View key={`${item.title}-${index}`} style={styles.historyCard}>
            <View>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            <Text style={[styles.historyAmount, item.amount < 0 && styles.historyAmountNegative]}>
              {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()} F
            </Text>
          </View>
        ))}
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
  title: {
    ...DriverTypography.title,
  },
  subtitle: {
    fontSize: 13,
    color: DriverColors.muted,
    marginTop: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: DriverColors.primary,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.lg,
    marginBottom: DriverSpacing.lg,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  heroValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: DriverColors.secondary,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.sm,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  sectionMeta: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  chartCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barWrap: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 16,
    borderRadius: 8,
    backgroundColor: DriverColors.primary,
  },
  barLabel: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 6,
  },
  historyCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  historyDate: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.success,
  },
  historyAmountNegative: {
    color: DriverColors.danger,
  },
});
