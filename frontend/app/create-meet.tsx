import { useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, type } from "@/src/theme";
import { createMeet } from "@/src/api";

const SAMPLE = `1 | Girls 8&U 25m Freestyle | 1
1 | Girls 8&U 25m Freestyle | 2
2 | Boys 8&U 25m Freestyle | 1
3 | Girls 9-10 50m Backstroke | 1`;

export default function CreateMeet() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [eventsText, setEventsText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) return setError("Enter a meet name");
    if (!passcode.trim()) return setError("Set a passcode for organizers");
    if (!eventsText.trim()) return setError("Paste your event list");
    setLoading(true);
    setError("");
    try {
      const meet = await createMeet(name.trim(), passcode.trim(), eventsText);
      router.replace(`/control?id=${meet.id}&passcode=${encodeURIComponent(passcode.trim())}&new=1`);
    } catch (e: any) {
      setError(e.message || "Could not create meet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="create-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>NEW MEET</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>MEET NAME</Text>
          <TextInput
            testID="meet-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Summer Invitational 2026"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>ORGANIZER PASSCODE</Text>
          <TextInput
            testID="meet-passcode-input"
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Choose a passcode"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <Text style={styles.hint}>You&apos;ll need this to control the meet. Parents don&apos;t need it.</Text>

          <View style={styles.labelRow}>
            <Text style={styles.label}>EVENT LIST</Text>
            <Pressable testID="load-sample-button" onPress={() => setEventsText(SAMPLE)} hitSlop={8}>
              <Text style={styles.sampleLink}>LOAD SAMPLE</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>One race per line:  EventNo | Event Name | Heat</Text>
          <TextInput
            testID="events-text-input"
            value={eventsText}
            onChangeText={setEventsText}
            placeholder={"12 | Girls 50m Freestyle | 3\n12 | Girls 50m Freestyle | 4\n13 | Boys 50m Freestyle | 1"}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={styles.textArea}
          />

          {!!error && <Text testID="create-error" style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <Pressable
          testID="start-meet-button"
          style={({ pressed }) => [styles.startBtn, pressed && { backgroundColor: colors.surface, borderTopColor: colors.border }]}
          onPress={onCreate}
          disabled={loading}
        >
          {({ pressed }) =>
            loading ? (
              <ActivityIndicator color={pressed ? colors.onSurface : colors.onInverse} />
            ) : (
              <Text style={[styles.startBtnText, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                START MEET
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
  label: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onSurface, letterSpacing: 1, marginTop: spacing.sm },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.sm },
  sampleLink: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.brand, textDecorationLine: "underline", letterSpacing: 1 },
  hint: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted },
  input: {
    fontFamily: fonts.body,
    fontSize: type.lg,
    color: colors.onSurface,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textArea: {
    fontFamily: fonts.body,
    fontSize: type.base,
    color: colors.onSurface,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 180,
  },
  errorText: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand, marginTop: spacing.sm },
  startBtn: { backgroundColor: colors.inverse, borderTopWidth: 2, borderTopColor: colors.border, paddingVertical: spacing.lg, alignItems: "center" },
  startBtnText: { fontFamily: fonts.display, fontSize: type.xl3, lineHeight: type.xl3, letterSpacing: 1 },
});
