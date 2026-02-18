import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

type Slide = {
  id: string;
  title: string;
  image: ImageSourcePropType;
  primary: string;
  secondary: string | null;
};

const slides: Slide[] = [
  {
    id: 'onb-1',
    title: 'Comment souhaitez-vous utiliser Ziwago ?',
    image: require('@/assets/images/Sale-pana1.png'),
    primary: 'Continuer',
    secondary: 'Je veux travailler comme laveur',
  },
  {
    id: 'onb-2',
    title: 'Lavez des voitures a tout moment, n importe ou.',
    image: require('@/assets/images/wash-pana1.png'),
    primary: 'Continuer',
    secondary: null,
  },
  {
    id: 'onb-3',
    title: 'Recevez, suivez et gagnez. Le tout dans une seule application.',
    image: require('@/assets/images/management-pana1.png'),
    primary: 'Commencer',
    secondary: null,
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { dispatch } = useDriverStore();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const handleAdvance = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      dispatch({ type: 'SET_ONBOARDING_DONE', value: true });
      router.replace('/account/phone');
    }
  };

  const handleSecondary = () => {
    if (index === 0) {
      dispatch({ type: 'SET_ONBOARDING_DONE', value: true });
      router.replace('/account/phone');
      return;
    }

    if (index === 1) {
      listRef.current?.scrollToIndex({ index: 2, animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.logo}>ZIWAGO</Text>
            <Image source={item.image} style={styles.hero} resizeMode="contain" />

            <View style={styles.pagination}>
              {slides.map((dot, dotIndex) => (
                <View key={dot.id} style={[styles.dot, dotIndex === index && styles.dotActive]} />
              ))}
            </View>

            <Text style={styles.title}>{item.title}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAdvance}>
                <Text style={styles.primaryText}>{item.primary}</Text>
              </TouchableOpacity>

              {item.secondary ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={handleSecondary}>
                  <Text style={styles.secondaryText}>{item.secondary}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    padding: DriverSpacing.lg,
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: DriverColors.primary,
    marginBottom: DriverSpacing.lg,
  },
  hero: {
    width: '100%',
    height: 300,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginTop: DriverSpacing.md,
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: DriverColors.primary,
  },
  title: {
    marginTop: DriverSpacing.lg,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: DriverColors.text,
  },
  actions: {
    width: '100%',
    marginTop: DriverSpacing.xl,
    gap: 12,
  },
  primaryButton: {
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
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryText: {
    color: DriverColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
