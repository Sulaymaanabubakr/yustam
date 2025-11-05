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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_SLIDES } from '../../config/constants';
import theme from '../../theme';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = () => {
    // Skip to last slide (role selection)
    slidesRef.current.scrollToIndex({ index: ONBOARDING_SLIDES.length - 1 });
  };

  const handleRoleSelection = async (role) => {
    try {
      await AsyncStorage.setItem('role', role);
      navigation.replace('Auth');
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const renderSlide = ({ item, index }) => {
    const isLastSlide = index === ONBOARDING_SLIDES.length - 1;

    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={80} color={theme.colors.orange} />
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>

        {isLastSlide && (
          <View style={styles.roleSection}>
            <Text style={styles.roleTitle}>Continue As</Text>
            
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelection('buyer')}
              activeOpacity={0.8}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: theme.colors.emerald }]}>
                <Ionicons name="bag-handle" size={40} color="white" />
              </View>
              <Text style={styles.roleLabel}>Buyer</Text>
              <Text style={styles.roleSubtext}>Browse and shop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelection('vendor')}
              activeOpacity={0.8}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: theme.colors.orange }]}>
                <Ionicons name="storefront" size={40} color="white" />
              </View>
              <Text style={styles.roleLabel}>Vendor</Text>
              <Text style={styles.roleSubtext}>Sell and grow</Text>
            </TouchableOpacity>

            <Text style={styles.switchRoleNote}>
              Chose the wrong role? You can change this later in Settings.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {ONBOARDING_SLIDES.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentIndex < ONBOARDING_SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      {currentIndex < ONBOARDING_SLIDES.length - 1 && (
        <View style={styles.footer}>
          {renderPagination()}
          <Button
            onPress={scrollTo}
            variant="primary"
            size="large"
            fullWidth
            icon="arrow-forward"
            iconPosition="right"
          >
            {currentIndex === ONBOARDING_SLIDES.length - 2 ? 'Get Started' : 'Next'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
  },
  skipText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['3xl'],
    color: theme.colors.emerald,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  description: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.lg,
  },
  roleSection: {
    marginTop: theme.spacing['3xl'],
    width: '100%',
    gap: theme.spacing.base,
  },
  roleTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  roleCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  roleIconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  roleSubtext: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  switchRoleNote: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.orange,
  },
});

export default OnboardingScreen;
