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
import { authMeet } from "@/src/api";

export default function Organizer() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onManage = async () => {
    if (!code.trim() || !passcode.trim()) {
      setError("Enter both meet code and passcode");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const meet = await authMeet(code.trim(), passcode.trim());
      router.replace(`/control?id=${meet.id}&passcode=${encodeURIComponent(passcode.trim())}`);
    } catch (e: any) {
      setError(e.message || "Could not access meet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="org-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>ORGANIZER</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            testID="create-meet-button"
            style={({ pressed }) => [styles.createCard, pressed && { backgroundColor: colors.surface }]}
            onPress={() => router.push("/create-meet")}
          >
            {({ pressed }) => (
              <>
                <Ionicons name="add-circle" size={40} color={pressed ? colors.onSurface : colors.onInverse} />
                <Text style={[styles.createTitle, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                  CREATE NEW MEET
                </Text>
                <Text style={[styles.createSub, { color: pressed ? colors.muted : colors.surfaceTertiary }]}>
                  Paste your event list and get a QR code
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>OR MANAGE EXISTING</Text>
          </View>

          <Text style={styles.label}>MEET CODE</Text>
          <TextInput
            testID="org-code-input"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={styles.input}
          />

          <Text style={styles.label}>PASSCODE</Text>
          <TextInput
            testID="org-passcode-input"
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Your meet passcode"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />

          {!!error && <Text testID="org-error" style={styles.errorText}>{error}</Text>}

          <Pressable
            testID="org-manage-button"
            style={({ pressed }) => [styles.manageBtn, pressed && { backgroundColor: colors.surface }]}
            onPress={onManage}
            disabled={loading}
          >
            {({ pressed }) =>
              loading ? (
                <ActivityIndicator color={pressed ? colors.onSurface : colors.onInverse} />
              ) : (
                <Text style={[styles.manageBtnText, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                  OPEN CONTROL PANEL
                </Text>
              )
            }
          </Pressable>
        </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  createCard: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, padding: spacing.xl, gap: spacing.xs, alignItems: "flex-start" },
  createTitle: { fontFamily: fonts.display, fontSize: type.xl3, lineHeight: type.xl3 },
  createSub: { fontFamily: fonts.body, fontSize: type.base },
  divider: { borderTopWidth: 2, borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md },
  dividerText: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.muted, letterSpacing: 2 },
  label: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onSurface, letterSpacing: 1, marginTop: spacing.sm },
  input: {
    fontFamily: fonts.body,
    fontSize: type.xl,
    color: colors.onSurface,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorText: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand },
  manageBtn: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  manageBtnText: { fontFamily: fonts.display, fontSize: type.xl2, letterSpacing: 1 },
});
