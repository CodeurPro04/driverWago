import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

const COMMISSION_RATE = 0.2;

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

export default function EarningsHistoryScreen() {
  const router = useRouter();
  const { state } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    header: {
      paddingHorizontal: DriverSpacing.lg,
      paddingTop: DriverSpacing.md,
      paddingBottom: DriverSpacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.iconButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...DriverTypography.section, color: palette.text },
    placeholder: { width: 36, height: 36 },
    content: { padding: DriverSpacing.lg, gap: DriverSpacing.sm },
    emptyCard: {
      borderRadius: DriverRadius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      padding: DriverSpacing.lg,
      alignItems: 'center',
    },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
    emptyText: { marginTop: 6, fontSize: 12, color: palette.textMuted, textAlign: 'center' },
    card: {
      borderRadius: DriverRadius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: DriverSpacing.md,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    customer: { fontSize: 14, fontWeight: '700', color: palette.text },
    net: { fontSize: 13, fontWeight: '800', color: DriverColors.success },
    meta: { marginTop: 4, fontSize: 12, color: palette.textMuted },
    breakdown: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
    breakdownText: { fontSize: 11, color: palette.text, fontWeight: '600' },
  });

  const completedJobs = useMemo(
    () =>
      state.jobs
        .filter((job) => job.status === 'completed')
        .map((job) => ({
          ...job,
          parsedDate: parseJobDate(job.createdAt) || parseJobDate(job.scheduledAt) || new Date(),
          commission: Math.round(job.price * COMMISSION_RATE),
          net: Math.round(job.price * (1 - COMMISSION_RATE)),
        }))
        .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()),
    [state.jobs]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={DriverColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historique des commandes</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {completedJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune commande terminee</Text>
            <Text style={styles.emptyText}>L historique de vos gains apparaitra ici apres vos missions.</Text>
          </View>
        ) : (
          completedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.customer}>{job.customerName}</Text>
                <Text style={styles.net}>+{job.net.toLocaleString()} F CFA</Text>
              </View>
              <Text style={styles.meta}>{job.service} - {job.vehicle}</Text>
              <Text style={styles.meta}>{job.parsedDate.toLocaleDateString('fr-FR')}</Text>
              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>Brut: {job.price.toLocaleString()} F CFA</Text>
                <Text style={styles.breakdownText}>Commission: -{job.commission.toLocaleString()} F CFA</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
