import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { logOut } from '../../services/firebase';
import { clearAllData, getUserData } from '../../services/storage';

interface ProfileScreenProps {
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [userData, setUserData] = React.useState<any>(null);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await getUserData();
    setUserData(data);
  };

  const handleLogout = async () => {
    await logOut();
    await clearAllData();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {userData && (
        <View style={styles.infoCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userData.displayName || 'N/A'}</Text>
          
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userData.email}</Text>
          
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{userData.phone || 'N/A'}</Text>
          
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{userData.role}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.ink,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  logoutText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default ProfileScreen;
