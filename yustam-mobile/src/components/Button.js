import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';

const Button = ({
  children,
  onPress,
  variant = 'primary', // primary, secondary, outline, text
  size = 'medium', // small, medium, large
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    // Size styles
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    } else {
      baseStyle.push(styles.buttonMedium);
    }

    // Variant styles
    if (variant === 'primary') {
      baseStyle.push(styles.buttonPrimary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.buttonSecondary);
    } else if (variant === 'outline') {
      baseStyle.push(styles.buttonOutline);
    } else if (variant === 'text') {
      baseStyle.push(styles.buttonText);
    }

    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }

    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }

    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];

    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.textLarge);
    } else {
      baseStyle.push(styles.textMedium);
    }

    if (variant === 'primary') {
      baseStyle.push(styles.textPrimary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.textSecondary);
    } else if (variant === 'outline') {
      baseStyle.push(styles.textOutline);
    } else if (variant === 'text') {
      baseStyle.push(styles.textText);
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={variant === 'primary' ? 'white' : theme.colors.orange}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 18 : size === 'large' ? 24 : 20}
              color={variant === 'primary' ? 'white' : theme.colors.orange}
              style={styles.iconLeft}
            />
          )}
          <Text style={getTextStyle()}>{children}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 18 : size === 'large' ? 24 : 20}
              color={variant === 'primary' ? 'white' : theme.colors.orange}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonSmall: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
  },
  buttonMedium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  buttonLarge: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.orange,
    ...theme.shadows.medium,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.emerald,
    ...theme.shadows.medium,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.orange,
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
  },
  textSmall: {
    fontSize: theme.typography.fontSize.sm,
  },
  textMedium: {
    fontSize: theme.typography.fontSize.base,
  },
  textLarge: {
    fontSize: theme.typography.fontSize.lg,
  },
  textPrimary: {
    color: 'white',
  },
  textSecondary: {
    color: 'white',
  },
  textOutline: {
    color: theme.colors.orange,
  },
  textText: {
    color: theme.colors.orange,
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});

export default Button;
