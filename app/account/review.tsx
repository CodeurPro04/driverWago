import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function UnderReviewScreen() {
  const { dispatch } = useDriverStore();

  useEffect(() => {
    dispatch({ type: 'SET_ACCOUNT_STEP', value: 7 });
  }, [dispatch]);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Votre profil est en cours d’examen</Text>
        <Text style={styles.body}>
          Merci d’avoir soumis vos documents. Notre équipe examine actuellement vos informations afin
          de vérifier votre identité et votre éligibilité à fournir des services de lavage sur Ziwago.
        </Text>
        <Text style={styles.body}>
          Ce processus prend généralement entre 24 et 48 heures. Vous recevrez une notification dès
          que votre compte sera approuvé.
        </Text>

        <Image source={require('@/assets/screens/Under Review.png')} style={styles.image} resizeMode="contain" />
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  body: {
    fontSize: 12,
    color: DriverColors.muted,
    lineHeight: 18,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 260,
    marginTop: DriverSpacing.lg,
  },
});
