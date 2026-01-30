import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';

const notifications = [
  {
    id: 'n1',
    title: 'Solde du portefeuille faible',
    body: "Le solde de votre portefeuille est inférieur à 1000 F CFA. Rechargez-le pour continuer à recevoir de nouvelles demandes.",
    time: 'Il y a 10 minutes',
    icon: 'warning',
  },
  {
    id: 'n2',
    title: 'Lavage terminé avec succès',
    body: "Vous avez gagné 6 300 F CFA pour le lavage d'aujourd'hui au Carrefour Duncan. Les fonds ont été ajoutés à votre portefeuille.",
    time: 'Il y a 1 heure',
    icon: 'checkmark-circle',
  },
  {
    id: 'n3',
    title: 'Retrait confirmé',
    body: 'Votre paiement de 20 000 F CFA a été envoyé sur votre compte bancaire. Vous devriez le recevoir dans les 24 heures.',
    time: 'Hier',
    icon: 'card',
  },
  {
    id: 'n4',
    title: 'Mise à jour importante de Ziwago',
    body: "Une maintenance régulière est prévue demain de 2 h à 4 h. L'application pourrait être temporairement indisponible.",
    time: 'Il y a 2 jours',
    icon: 'notifications',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={DriverColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.clearButton}>
          <Ionicons name="checkmark" size={18} color={DriverColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name={item.icon as any} size={16} color={DriverColors.accent} />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
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
  header: {
    paddingHorizontal: DriverSpacing.lg,
    paddingTop: DriverSpacing.md,
    paddingBottom: DriverSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...DriverTypography.section,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: DriverSpacing.lg,
    gap: DriverSpacing.md,
  },
  card: {
    padding: DriverSpacing.md,
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
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
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  cardTime: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  cardBody: {
    fontSize: 12,
    color: DriverColors.muted,
    lineHeight: 18,
  },
});
