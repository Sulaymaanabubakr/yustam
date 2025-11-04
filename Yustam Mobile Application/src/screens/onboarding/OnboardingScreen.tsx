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
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { setOnboardingComplete, saveUserRole } from '../../services/storage';

const { width } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: IoniconName;
}

const slides: OnboardingSlide[] = [
  {
    id: 'buyers',
    title: 'Buy from Verified Vendors',
    description: 'Shop with confidence from trusted sellers across Nigeria.',
    icon: 'shield-checkmark',
  },
  {
    id: 'sellers',
    title: 'Sell Smarter & Grow',
    description: 'Reach thousands of buyers and grow your business faster.',
    icon: 'trending-up',
  },
  {
    id: 'community',
    title: 'Join the Community',
    description: "Nigeria's most trusted marketplace. Let's get started!",
    icon: 'people-circle',
  },
];

interface OnboardingScreenProps {
  onComplete: (role: 'buyer' | 'vendor') => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
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
      <View style={styles.iconBadge}>
        <Ionicons name={item.icon} size={72} color={COLORS.orange} />
      </View>
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

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {renderPagination()}

      {isLastSlide ? (
        <View style={styles.roleSelectionContainer}>
          <Text style={styles.roleTitle}>How would you like to use YUSTAM?</Text>
          <TouchableOpacity
            style={[styles.roleButton, styles.buyerButton]}
            onPress={() => handleRoleSelection('buyer')}
          >
            <Ionicons name="cart" size={24} color={COLORS.white} />
            <View style={styles.roleTextWrapper}>
              <Text style={styles.roleButtonText}>I am a Buyer</Text>
              <Text style={styles.roleButtonSubtext}>Shop from verified vendors</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, styles.vendorButton]}
            onPress={() => handleRoleSelection('vendor')}
          >
            <Ionicons name="storefront" size={24} color={COLORS.white} />
            <View style={styles.roleTextWrapper}>
              <Text style={styles.roleButtonText}>I am a Vendor</Text>
              <Text style={styles.roleButtonSubtext}>Sell and grow your business</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
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
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: SPACING.xs,
  },
  dot: {
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.orange,
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
    gap: SPACING.md,
  },
  roleTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  roleTextWrapper: {
    flex: 1,
  },
  buyerButton: {
    backgroundColor: COLORS.emerald,
  },
  vendorButton: {
    backgroundColor: COLORS.orange,
  },
  roleButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  roleButtonSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: SPACING.xs,
  },
});

export default OnboardingScreen;
