import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';

const Toast = ({ message, type = 'info', visible, onDismiss, duration = 3000 }) => {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: theme.colors.success, icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: theme.colors.error, icon: 'close-circle' };
      case 'warning':
        return { backgroundColor: theme.colors.warning, icon: 'warning' };
      default:
        return { backgroundColor: theme.colors.info, icon: 'information-circle' };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: toastStyle.backgroundColor },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={toastStyle.icon} size={24} color="white" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: theme.spacing.base,
    right: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    zIndex: 9999,
    ...theme.shadows.strong,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.interMedium,
  },
});

export default Toast;
