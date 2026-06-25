import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, type } from "@/src/theme";
import { readMeet, updateEvents } from "@/src/api";

export default function EditEvents() {
  const router = useRouter();
  const { id, passcode } = useLocalSearchParams<{ id: string; passcode: string }>();
  const [eventsText, setEventsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const meet = await readMeet(id!);
          if (active) {
            const text = meet.races
              .map((r) => `${r.event_number} | ${r.event_name} | ${r.heat_number}`)
              .join("\n");
            setEventsText(text);
          }
        } catch (e: any) {
          if (active) setError(e.message || "Could not load events");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [id])
  );

  const onSave = async () => {
    if (!eventsText.trim()) return setError("Event list cannot be empty");
    setSaving(true);
    setError("");
    try {
      await updateEvents(id!, passcode!, eventsText);
      router.back();
    } catch (e: any) {
      setError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="edit-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>EDIT EVENTS</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.onSurface} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>One race per line:  EventNo | Event Name | Heat</Text>
            <Text style={styles.warn}>Saving resets the current race to the first one.</Text>
            <TextInput
              testID="edit-events-input"
              value={eventsText}
              onChangeText={setEventsText}
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />
            {!!error && <Text testID="edit-error" style={styles.errorText}>{error}</Text>}
          </ScrollView>
        )}

        <Pressable
          testID="save-events-button"
          style={({ pressed }) => [styles.saveBtn, pressed && { backgroundColor: colors.surface }]}
          onPress={onSave}
          disabled={saving || loading}
        >
          {({ pressed }) =>
            saving ? (
              <ActivityIndicator color={pressed ? colors.onSurface : colors.onInverse} />
            ) : (
              <Text style={[styles.saveBtnText, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                SAVE EVENT LIST
              </Text>
            )
          }
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onSurface, letterSpacing: 1 },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  hint: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted },
  warn: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.brand },
  textArea: {
    fontFamily: fonts.body,
    fontSize: type.base,
    color: colors.onSurface,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 320,
    marginTop: spacing.sm,
  },
  errorText: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand, marginTop: spacing.sm },
  saveBtn: { backgroundColor: colors.inverse, borderTopWidth: 2, borderTopColor: colors.border, paddingVertical: spacing.lg, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.display, fontSize: type.xl2, letterSpacing: 1 },
});
