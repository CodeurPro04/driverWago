import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const SETTINGS = [
  { id: 'docs', label: 'Documents', icon: 'document-text' },
  { id: 'vehicle', label: 'V\u00e9hicule', icon: 'car' },
  { id: 'zones', label: 'Zones de service', icon: 'map' },
  { id: 'support', label: 'Support', icon: 'headset' },
];

export default function ProfileScreen() {
  const { state } = useDriverStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="settings" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{state.driverName.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{state.driverName} K.</Text>
            <Text style={styles.profileMeta}>Livreur ZIWAGO</Text>
            <View style={styles.profileTags}>
              <View style={styles.tag}>
                <Ionicons name="checkmark-circle" size={12} color={DriverColors.success} />
                <Text style={styles.tagText}>Compte verifier</Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="shield-checkmark" size={12} color={DriverColors.primary} />
                <Text style={styles.tagText}>Assuré</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.jobs.length}</Text>
            <Text style={styles.statLabel}>Missions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.cashoutBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Solde</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Note</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes paramètres</Text>
          <Text style={styles.sectionMeta}>A jour</Text>
        </View>

        {SETTINGS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={DriverColors.primary}
              />
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={DriverColors.muted} />
          </TouchableOpacity>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Disponibilité</Text>
          <Text style={styles.sectionMeta}>{state.availability ? 'En ligne' : 'Hors ligne'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Horaires suggérés</Text>
          <Text style={styles.infoText}>
            Lundi - Vendredi | 08:00 - 20:00
          </Text>
          <Text style={styles.infoText}>
            Samedi | 09:00 - 18:00
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
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
  profileCard: {
    flexDirection: 'row',
    gap: DriverSpacing.md,
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DriverColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
  },
  profileMeta: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 4,
  },
  profileTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: DriverColors.chip,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: DriverSpacing.sm,
    marginBottom: DriverSpacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  statLabel: {
    fontSize: 11,
    color: DriverColors.muted,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: DriverSpacing.md,
    borderRadius: DriverRadius.md,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  infoCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  infoText: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 6,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.danger,
  },
});
