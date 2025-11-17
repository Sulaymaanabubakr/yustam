import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';

const normalizeOptions = (options = []) =>
  options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return {
      label: option.label ?? option.value,
      value: option.value ?? option.label,
      description: option.description,
      meta: option.meta,
    };
  });

const SelectField = ({
  label,
  placeholder = 'Select an option',
  value,
  options = [],
  onSelect,
  disabled = false,
  helperText,
  error = false,
  selectionType = 'single',
  searchable = true,
  loading = false,
  modalTitle,
}) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const isMultiple = selectionType === 'multiple';
  const [draftSelection, setDraftSelection] = useState(
    isMultiple ? (Array.isArray(value) ? value : []) : value ?? null
  );

  const selectedValue = isMultiple ? (Array.isArray(value) ? value : []) : value ?? null;
  const selectedOption = !isMultiple
    ? normalizedOptions.find((option) => option.value === selectedValue)
    : null;

  const shouldShowSearch = searchable && normalizedOptions.length > 6;

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return normalizedOptions;
    }
    return normalizedOptions.filter((option) => {
      const labelMatch = option.label?.toLowerCase().includes(query);
      const descriptionMatch = option.description?.toLowerCase().includes(query);
      return labelMatch || descriptionMatch;
    });
  }, [normalizedOptions, searchQuery]);

  useEffect(() => {
    if (visible) {
      setDraftSelection(isMultiple ? selectedValue : selectedValue ?? null);
    } else {
      setSearchQuery('');
    }
  }, [visible, isMultiple, selectedValue]);

  useEffect(() => {
    if (!visible) {
      setDraftSelection(isMultiple ? selectedValue : selectedValue ?? null);
    }
  }, [value, visible, isMultiple, selectedValue]);

  const commitSelection = (nextValue) => {
    if (typeof onSelect === 'function') {
      onSelect(nextValue);
    }
  };

  const handleSingleSelect = (option) => {
    setVisible(false);
    if (option.value !== selectedValue) {
      commitSelection(option.value);
    }
  };

  const toggleMultiValue = (optionValue) => {
    setDraftSelection((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const index = next.indexOf(optionValue);
      if (index >= 0) {
        next.splice(index, 1);
      } else {
        next.push(optionValue);
      }
      return next;
    });
  };

  const handleApplyMulti = () => {
    commitSelection(Array.isArray(draftSelection) ? draftSelection : []);
    setVisible(false);
  };

  const handleClearMulti = () => {
    setDraftSelection([]);
  };

  const displayValue = () => {
    if (isMultiple) {
      const count = Array.isArray(selectedValue) ? selectedValue.length : 0;
      return count > 0 ? `${count} selected` : placeholder;
    }
    return selectedOption ? selectedOption.label : placeholder;
  };

  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[
          styles.selector,
          (disabled || loading) && styles.selectorDisabled,
          error && styles.selectorError,
        ]}
        onPress={() => {
          if (!disabled && !loading) {
            setVisible(true);
          }
        }}
      >
        <Text
          style={[
            styles.selectorValue,
            (!selectedOption && !(Array.isArray(selectedValue) && selectedValue.length)) &&
              styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayValue()}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : (
          <Ionicons
            name="chevron-down"
            size={18}
            color={disabled ? theme.colors.textSecondary : theme.colors.textPrimary}
          />
        )}
      </Pressable>
      {helperText ? (
        <Text style={[styles.helperText, error && styles.helperTextError]}>{helperText}</Text>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.touchBlocker} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{modalTitle || label || 'Select an option'}</Text>
                <Text style={styles.sheetSubtitle}>
                  {isMultiple ? 'Choose one or more options' : 'Choose one option'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {shouldShowSearch ? (
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  placeholder="Search options"
                  placeholderTextColor={theme.colors.textSecondary}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.optionList}>
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={32} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyText}>No options match your search</Text>
                </View>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = isMultiple
                    ? Array.isArray(draftSelection) && draftSelection.includes(option.value)
                    : option.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() =>
                        isMultiple ? toggleMultiValue(option.value) : handleSingleSelect(option)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionBody}>
                        <View style={styles.optionLabelRow}>
                          <Text style={styles.optionLabel} numberOfLines={1}>
                            {option.label}
                          </Text>
                          {option.meta ? (
                            <View style={styles.optionMeta}>
                              <Text style={styles.optionMetaText}>{option.meta}</Text>
                            </View>
                          ) : null}
                        </View>
                        {option.description ? (
                          <Text style={styles.optionDescription} numberOfLines={2}>
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={
                          isMultiple
                            ? isSelected
                              ? 'checkbox'
                              : 'square-outline'
                            : isSelected
                              ? 'radio-button-on'
                              : 'radio-button-off'
                        }
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {isMultiple ? (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearMulti}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyMulti}>
                  <Text style={styles.applyButtonText}>Apply Selection</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  selector: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.base,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorError: {
    borderColor: theme.colors.error,
  },
  selectorValue: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
  },
  helperText: {
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  helperTextError: {
    color: theme.colors.error,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  touchBlocker: {
    flex: 1,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  optionList: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    borderColor: `${theme.colors.primary}40`,
    backgroundColor: `${theme.colors.primary}08`,
  },
  optionBody: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  optionLabel: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  optionMeta: {
    backgroundColor: `${theme.colors.accent}20`,
    borderRadius: theme.borderRadius.full || 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  optionMetaText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent,
  },
  optionDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  clearButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  clearButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
});

export default SelectField;
