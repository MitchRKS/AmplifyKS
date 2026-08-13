import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  MIN_QUERY_LENGTH,
  suggestKansasAddresses,
  type AddressSuggestion,
} from '@/services/address-autocomplete';

const DEBOUNCE_MS = 300;

interface AddressAutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when the user picks a suggestion (its coords skip geocoding). */
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
}

/**
 * Address input with Kansas-only search-as-you-type suggestions, shared by
 * the lookup screens. Renders the suggestion list inline below the input
 * (absolute overlays fight ScrollView clipping on native). Suggestions are a
 * progressive enhancement — typing and searching manually still works.
 */
export function AddressAutocompleteInput({
  value,
  onChangeText,
  onSelectSuggestion,
  onSubmitEditing,
  placeholder,
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // The label just picked — suppresses the refetch its onChangeText triggers,
  // so the dropdown doesn't pop back open over the results.
  const lastSelectedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholderColor = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  useEffect(() => {
    if (value === lastSelectedRef.current) {
      setSuggestions([]);
      return;
    }
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      suggestKansasAddresses(value, { signal: controller.signal }).then((results) => {
        // A stale response for an older query loses to the newer request.
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    lastSelectedRef.current = suggestion.label;
    setSuggestions([]);
    onSelectSuggestion(suggestion);
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        // Delay so a tap on a suggestion lands before the list unmounts.
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        autoCapitalize="words"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel="Address"
      />

      {showSuggestions && (
        <View style={[styles.suggestionList, { backgroundColor: surface, borderColor: inputBorder }]}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              accessibilityRole="button"
              accessibilityLabel={`Use address ${suggestion.label}`}
              style={({ pressed }) => [
                styles.suggestionRow,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: inputBorder },
                pressed && styles.suggestionPressed,
              ]}
              onPress={() => handleSelect(suggestion)}
            >
              <MaterialIcons
                name={suggestion.verified ? 'check-circle' : 'place'}
                size={16}
                color={suggestion.verified ? '#4CAF50' : mutedText}
              />
              <ThemedText style={styles.suggestionText} numberOfLines={1}>
                {suggestion.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
  },
  suggestionList: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
  },
  suggestionPressed: {
    opacity: 0.6,
  },
});
