import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import theme from '../../theme';

const BotScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>YustaAI Personal Shopper</Text>
        <Text style={styles.body}>
          We are setting up YustaAI, your AI-powered shopping assistant. Soon you will be able to ask for
          personalised product suggestions, track wishlist alerts, and learn how to maximise vendor
          rewards right from this tab.
        </Text>
        <Text style={styles.body}>
          Stay tuned while we finish connecting the experience end-to-end.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heading: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  body: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
});

export default BotScreen;