import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { setOnboardingComplete, saveUserRole } from '../../services/storage';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Buy from Verified Vendors',
    description: 'Shop with confidence from trusted sellers across Nigeria.',
    emoji: '🛍️',
  },
  {
    id: '2',
    title: 'Sell Smarter & Grow',
    description: 'Reach thousands of buyers and grow your business faster.',
    emoji: '📈',
  },
  {
    id: '3',
    title: 'Join the Community',
    description: "Nigeria's most trusted marketplace. Let's get started!",
    emoji: '🤝',
  },
];

interface OnboardingScreenProps {
  onComplete: (role: 'buyer' | 'vendor') => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
      });
    }
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
    // Default to buyer if skipped
    await saveUserRole('buyer');
    onComplete('buyer');
  };

  const handleRoleSelection = async (role: 'buyer' | 'vendor') => {
    await setOnboardingComplete();
    await saveUserRole(role);
    onComplete(role);
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {slides.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [10, 24, 10],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />

      {renderPagination()}

      {currentIndex < slides.length - 1 ? (
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.roleSelectionContainer}>
          <Text style={styles.roleTitle}>Continue as:</Text>
          <TouchableOpacity
            onPress={() => handleRoleSelection('buyer')}
            style={[styles.roleButton, styles.buyerButton]}
          >
            <Text style={styles.roleButtonText}>🛒 Buyer</Text>
            <Text style={styles.roleButtonSubtext}>Shop from verified vendors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRoleSelection('vendor')}
            style={[styles.roleButton, styles.vendorButton]}
          >
            <Text style={styles.roleButtonText}>🏪 Vendor</Text>
            <Text style={styles.roleButtonSubtext}>Sell and grow your business</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 100,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dot: {
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.orange,
    marginHorizontal: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  skipButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  skipText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
  },
  nextText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '700',
  },
  roleSelectionContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  roleTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  roleButton: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buyerButton: {
    backgroundColor: COLORS.emerald,
  },
  vendorButton: {
    backgroundColor: COLORS.orange,
  },
  roleButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  roleButtonSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
});

export default OnboardingScreen;
