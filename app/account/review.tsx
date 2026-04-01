import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { getUserProfile } from '@/lib/api';

export default function UnderReviewScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isRejected = state.profileStatus === 'rejected' || state.documentsStatus === 'rejected';
  const isApproved = state.profileStatus === 'approved' || (state.accountStep >= 6 && state.documentsStatus === 'submitted');

  useEffect(() => {
    if (!isApproved) return;
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 0);
    return () => clearTimeout(timer);
  }, [isApproved, router]);

  useEffect(() => {
    dispatch({ type: 'SET_ACCOUNT_STEP', value: 7 });
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async (silent = true) => {
      if (!state.driverId) return;
      try {
        if (!silent) setRefreshing(true);
        const profile = await getUserProfile(state.driverId);
        const status = (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected';
        const accountStep = Number(profile.user.account_step || 7);
        const docs = (profile.user.documents as Record<string, string | null>) || {};
        const docsStatus = (profile.user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected';
        dispatch({ type: 'SET_PROFILE_STATUS', value: status });
        dispatch({ type: 'SET_ACCOUNT_STEP', value: accountStep });
        dispatch({ type: 'SET_DOCUMENTS', value: docs });
        dispatch({ type: 'SET_DOCUMENTS_STATUS', value: docsStatus });
        if (cancelled) return;

        if (status === 'approved') {
          dispatch({ type: 'SET_ACCOUNT_STEP', value: 8 });
          router.replace('/(tabs)');
        } else if (status === 'rejected' || docsStatus === 'rejected' || accountStep < 6) {
          router.replace('/account/documents');
        }
      } catch {
        // keep local state
      } finally {
        if (!silent) setRefreshing(false);
      }
    };

    check();
    timer = setInterval(() => {
      check();
    }, 15000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [dispatch, router, state.driverId]);

  const handleRefreshStatus = async () => {
    if (!state.driverId || loading || refreshing) return;
    setLoading(true);
    try {
      const profile = await getUserProfile(state.driverId);
      const status = (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected';
      const accountStep = Number(profile.user.account_step || 7);
      const docs = (profile.user.documents as Record<string, string | null>) || {};
      const docsStatus = (profile.user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected';
      dispatch({ type: 'SET_PROFILE_STATUS', value: status });
      dispatch({ type: 'SET_ACCOUNT_STEP', value: accountStep });
      dispatch({ type: 'SET_DOCUMENTS', value: docs });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: docsStatus });
      if (status === 'approved') {
        dispatch({ type: 'SET_ACCOUNT_STEP', value: 8 });
        router.replace('/(tabs)');
      } else if (status === 'rejected' || docsStatus === 'rejected' || accountStep < 6) {
        router.replace('/account/documents');
      }
    } catch {
      // keep local state
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Votre profil est en cours d examen</Text>
        <Text style={styles.body}>
          Vos documents ont ete transmis. Votre compte reste en attente jusqu a validation par l administrateur.
        </Text>
        {!isRejected ? (
          <Text style={styles.redirectHint}>Redirection automatique vers l application...</Text>
        ) : null}

        <Image source={require('@/assets/screens/Under Review.png')} style={styles.image} resizeMode="contain" />

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>
            Statut: {isApproved ? 'Valide' : isRejected ? 'Refuse' : 'En attente'}
          </Text>
          <Text style={styles.statusBody}>
            {isRejected
              ? 'Votre dossier a ete refuse. Mettez a jour vos documents pour une nouvelle soumission.'
              : 'Vous ne pouvez pas voir les missions tant que votre compte n est pas valide.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRefreshStatus} disabled={loading || refreshing}>
          {loading || refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Actualiser le statut</Text>
          )}
        </TouchableOpacity>

        {isRejected ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/account/documents')}>
            <Text style={styles.secondaryText}>Mettre a jour mes documents</Text>
          </TouchableOpacity>
        ) : null}
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
    marginBottom: 6,
  },
  redirectHint: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: DriverColors.primary,
    fontWeight: '600',
    marginBottom: 4,
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
  statusBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#F9FAFB',
    padding: DriverSpacing.md,
    marginBottom: DriverSpacing.md,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 6,
  },
  statusBody: {
    fontSize: 12,
    lineHeight: 18,
    color: DriverColors.muted,
  },
  secondaryButton: {
    width: '100%',
    marginTop: DriverSpacing.sm,
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
});
