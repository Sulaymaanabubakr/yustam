import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { CATEGORIES, STATES } from '../../config/constants';
import theme from '../../theme';
import Button from '../../components/Button';

const SearchScreen = ({ route }) => {
  const [searchQuery, setSearchQuery] = useState(route?.params?.query || '');
  const [category, setCategory] = useState(route?.params?.category || '');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleSearch = () => {
    // TODO: Implement search with filters
    console.log('Searching:', { searchQuery, category, location, minPrice, maxPrice });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="What are you looking for?"
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filters</Text>

          <View style={styles.filterGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
              >
                <Picker.Item label="All Categories" value="" />
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={location}
                onValueChange={setLocation}
                style={styles.picker}
              >
                <Picker.Item label="All Nigeria" value="" />
                {STATES.map((state) => (
                  <Picker.Item key={state} label={state} value={state} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.label}>Price Range</Text>
            <View style={styles.priceRangeContainer}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.priceRangeSeparator}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
          </View>

          <Button
            onPress={handleSearch}
            variant="primary"
            size="large"
            fullWidth
            icon="search"
          >
            Apply Filters
          </Button>
        </View>

        {/* Results will go here */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsText}>
            Enter a search query and apply filters to see results
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  filtersSection: {
    gap: theme.spacing.base,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  filterGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  pickerContainer: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  priceInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.white,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  priceRangeSeparator: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  resultsSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  resultsText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default SearchScreen;
