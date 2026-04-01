import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import { getDriverPalette } from '@/lib/driverAppearance';

const PERIODS = ['Jour', 'Semaine', 'Mois'] as const;
const COMMISSION_RATE = 0.2;

type Point = { label: string; value: number };

const parseJobDate = (value?: string) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;
  const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default function EarningsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  useScreenRefresh({ jobs: true, inbox: true, intervalMs: 30000 });
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Jour');
  const unreadCount = useMemo(() => state.notifications.filter((item) => !item.read).length, [state.notifications]);

  const now = useMemo(() => new Date(), []);

  const completedJobs = useMemo(
    () =>
      state.jobs
        .filter((job) => job.status === 'completed')
        .map((job) => ({
          ...job,
          parsedDate: parseJobDate(job.createdAt) || parseJobDate(job.scheduledAt) || new Date(),
          net: Math.round(job.price * (1 - COMMISSION_RATE)),
        })),
    [state.jobs]
  );

  const periodStart = useMemo(() => {
    const base = startOfDay(now);
    if (period === 'Jour') return base;
    if (period === 'Semaine') {
      const d = new Date(base);
      d.setDate(base.getDate() - 6);
      return d;
    }
    const d = new Date(base);
    d.setDate(base.getDate() - 29);
    return d;
  }, [period, now]);

  const filteredCompleted = useMemo(
    () => completedJobs.filter((job) => job.parsedDate >= periodStart && job.parsedDate <= now),
    [completedJobs, periodStart, now]
  );

  const completedCount = filteredCompleted.length;
  const grossEarnings = useMemo(() => filteredCompleted.reduce((sum, job) => sum + job.price, 0), [filteredCompleted]);
  const commissionTotal = useMemo(() => Math.round(grossEarnings * COMMISSION_RATE), [grossEarnings]);
  const netEarnings = useMemo(() => Math.max(0, grossEarnings - commissionTotal), [grossEarnings, commissionTotal]);

  const chartData = useMemo<Point[]>(() => {
    if (period === 'Jour') {
      const labels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
      const values = [0, 0, 0, 0, 0, 0];
      filteredCompleted.forEach((job) => {
        const h = job.parsedDate.getHours();
        const idx = Math.min(5, Math.floor(h / 4));
        values[idx] += job.net;
      });
      return labels.map((label, idx) => ({ label, value: values[idx] }));
    }

    if (period === 'Semaine') {
      const labels: Point[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push({
          label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
          value: 0,
        });
      }
      filteredCompleted.forEach((job) => {
        const dayDiff = Math.floor((startOfDay(now).getTime() - startOfDay(job.parsedDate).getTime()) / 86400000);
        const idx = 6 - dayDiff;
        if (idx >= 0 && idx < labels.length) labels[idx].value += job.net;
      });
      return labels;
    }

    const buckets: Point[] = [
      { label: 'S1', value: 0 },
      { label: 'S2', value: 0 },
      { label: 'S3', value: 0 },
      { label: 'S4', value: 0 },
    ];
    filteredCompleted.forEach((job) => {
      const dayDiff = Math.floor((startOfDay(now).getTime() - startOfDay(job.parsedDate).getTime()) / 86400000);
      const idx = Math.min(3, Math.floor(dayDiff / 7));
      buckets[3 - idx].value += job.net;
    });
    return buckets;
  }, [filteredCompleted, period, now]);

  const maxChartValue = useMemo(() => Math.max(...chartData.map((p) => p.value), 1), [chartData]);
  const bestPoint = useMemo(
    () => chartData.reduce((best, p) => (p.value > best.value ? p : best), { label: '-', value: 0 }),
    [chartData]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.statusPill, { backgroundColor: palette.surfaceMuted }]}>
            <TouchableOpacity
              style={[styles.statusOption, !state.availability && styles.statusOptionActive]}
              onPress={() => state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, { color: palette.textMuted }, !state.availability && styles.statusTextActive]}>Hors ligne</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, state.availability && styles.statusOptionActive]}
              onPress={() => !state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, { color: palette.textMuted }, state.availability && styles.statusTextActive]}>En ligne</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: palette.iconButton }]} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color={DriverColors.primary} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={[styles.segmented, { backgroundColor: palette.surfaceMuted }]}>
          {PERIODS.map((item) => {
            const active = item === period;
            return (
              <TouchableOpacity key={item} style={[styles.segment, active && styles.segmentActive]} onPress={() => setPeriod(item)}>
                <Text style={[styles.segmentText, { color: palette.textMuted }, active && styles.segmentTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.overviewCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{completedCount}</Text>
            <Text style={[styles.overviewLabel, { color: palette.textMuted }]}>Commandes</Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: palette.border }]} />
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{netEarnings.toLocaleString()} F CFA</Text>
            <Text style={[styles.overviewLabel, { color: palette.textMuted }]}>Gain net</Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: palette.border }]} />
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{state.rating.toFixed(1)}</Text>
            <Text style={[styles.overviewLabel, { color: palette.textMuted }]}>Evaluation</Text>
          </View>
        </View>

        <View style={[styles.financeCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.financeTitle, { color: palette.text }]}>Detail des gains ({period.toLowerCase()})</Text>
          <View style={styles.financeRow}>
            <Text style={[styles.financeLabel, { color: palette.textMuted }]}>Montant total commandes</Text>
            <Text style={styles.financeValue}>{grossEarnings.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={[styles.financeLabel, { color: palette.textMuted }]}>Commission ({Math.round(COMMISSION_RATE * 100)}%)</Text>
            <Text style={styles.financeNegative}>- {commissionTotal.toLocaleString()} F CFA</Text>
          </View>
          <View style={[styles.financeDivider, { backgroundColor: palette.border }]} />
          <View style={styles.financeRow}>
            <Text style={[styles.financeNetLabel, { color: palette.text }]}>Gain net</Text>
            <Text style={styles.financeNetValue}>{netEarnings.toLocaleString()} F CFA</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.historyButton, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]} onPress={() => router.push('/earnings-history')}>
          <Ionicons name="time" size={16} color={DriverColors.primary} />
          <Text style={[styles.historyButtonText, { color: palette.text }]}>Voir l historique des commandes</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Votre progression</Text>
          <Text style={[styles.progressMeta, { color: palette.textMuted }]}>
            Pic: {bestPoint.label} ({bestPoint.value.toLocaleString()} F CFA)
          </Text>
        </View>

        <View style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.chartBars}>
            {chartData.map((point) => {
              const heightPct = Math.max(6, Math.round((point.value / maxChartValue) * 100));
              return (
                <View key={point.label} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: palette.textMuted }]}>{point.label}</Text>
                  <Text style={[styles.barValue, { color: palette.text }]}>{Math.round(point.value / 1000)}k</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DriverColors.background },
  content: { padding: DriverSpacing.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DriverSpacing.lg },
  statusPill: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 999 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  statusOptionActive: { backgroundColor: DriverColors.primary },
  statusText: { fontSize: 12, fontWeight: '600', color: DriverColors.muted },
  statusTextActive: { color: '#FFFFFF' },
  notificationButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
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
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  segmented: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 999, padding: 4, marginBottom: DriverSpacing.lg },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 999 },
  segmentActive: { backgroundColor: DriverColors.primary },
  segmentText: { fontSize: 12, fontWeight: '600', color: DriverColors.muted },
  segmentTextActive: { color: '#FFFFFF' },
  overviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DriverSpacing.md,
  },
  overviewItem: { flex: 1, alignItems: 'center', gap: 4 },
  overviewValue: { fontSize: 14, fontWeight: '700', color: DriverColors.text },
  overviewLabel: { fontSize: 11, color: DriverColors.muted },
  overviewDivider: { width: 1, height: 34, backgroundColor: DriverColors.border },
  financeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: DriverSpacing.md,
  },
  financeTitle: { fontSize: 13, fontWeight: '700', color: DriverColors.text, marginBottom: 2 },
  financeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  financeLabel: { fontSize: 12, color: DriverColors.muted, fontWeight: '600' },
  financeValue: { fontSize: 12, color: DriverColors.text, fontWeight: '700' },
  financeNegative: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  financeDivider: { height: 1, backgroundColor: DriverColors.border },
  financeNetLabel: { fontSize: 13, color: DriverColors.text, fontWeight: '800' },
  financeNetValue: { fontSize: 14, color: DriverColors.success, fontWeight: '900' },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: DriverSpacing.lg,
  },
  historyButtonText: { fontSize: 12, fontWeight: '600', color: DriverColors.text },
  sectionHeader: { marginBottom: DriverSpacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...DriverTypography.section },
  progressMeta: { fontSize: 11, color: DriverColors.muted, fontWeight: '600' },
  chartCard: {
    height: 230,
    borderRadius: DriverRadius.lg,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: DriverColors.primary, borderRadius: 10 },
  barLabel: { marginTop: 8, fontSize: 10, color: DriverColors.muted, fontWeight: '700' },
  barValue: { marginTop: 2, fontSize: 10, color: DriverColors.text, fontWeight: '700' },
});
