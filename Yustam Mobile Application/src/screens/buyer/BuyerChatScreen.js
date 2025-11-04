import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BuyerChatScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat Screen</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004D40',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default BuyerChatScreen;
