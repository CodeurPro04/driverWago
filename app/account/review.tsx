import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { approveDriverProfile, getUserProfile } from '@/lib/api';

export default function UnderReviewScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch({ type: 'SET_ACCOUNT_STEP', value: 7 });

    const check = async () => {
      if (!state.driverId) return;
      try {
        const profile = await getUserProfile(state.driverId);
        const status = (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected';
        dispatch({ type: 'SET_PROFILE_STATUS', value: status });
        if (status === 'approved') {
          dispatch({ type: 'SET_ACCOUNT_STEP', value: 8 });
          router.replace('/(tabs)');
        }
      } catch {
        // keep local state
      }
    };

    check();
  }, [dispatch, router, state.driverId]);

  const handleApproveNow = async () => {
    if (!state.driverId) {
      Alert.alert('Session invalide', 'Reconnectez-vous pour continuer.');
      return;
    }

    setLoading(true);
    try {
      const approved = await approveDriverProfile(state.driverId);
      const status = (approved.user.profile_status || 'approved') as 'pending' | 'approved' | 'rejected';
      dispatch({ type: 'SET_PROFILE_STATUS', value: status });
      dispatch({ type: 'SET_ACCOUNT_STEP', value: approved.user.account_step || 8 });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Erreur', 'Impossible de valider votre profil maintenant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Votre profil est en cours d examen</Text>
        <Text style={styles.body}>
          Vos informations ont ete transmises au backend. Vous pouvez forcer la validation maintenant pour continuer.
        </Text>

        <Image source={require('@/assets/screens/Under Review.png')} style={styles.image} resizeMode="contain" />

        <TouchableOpacity style={styles.primaryButton} onPress={handleApproveNow} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryText}>Valider mon profil et continuer</Text>}
        </TouchableOpacity>
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
    marginBottom: DriverSpacing.lg,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
