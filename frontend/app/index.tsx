import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, type } from "@/src/theme";

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Ionicons name="water" size={34} color={colors.accentBlue} />
            <Text style={styles.logo}>POOLSIDE LIVE</Text>
          </View>
          <Text style={styles.tagline}>REAL-TIME SWIM MEET RACE BOARD</Text>
        </View>

        <View style={styles.body}>
          <Pressable
            testID="join-meet-button"
            style={({ pressed }) => [styles.bigBtn, styles.btnDark, pressed && styles.pressedInvert]}
            onPress={() => router.push("/scan")}
          >
            {({ pressed }) => (
              <>
                <Ionicons name="qr-code" size={40} color={pressed ? colors.onSurface : colors.onInverse} />
                <Text style={[styles.bigBtnTitle, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                  JOIN A MEET
                </Text>
                <Text style={[styles.bigBtnSub, { color: pressed ? colors.muted : colors.surfaceTertiary }]}>
                  Scan QR or enter code · for parents
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            testID="organizer-button"
            style={({ pressed }) => [styles.compactBtn, styles.btnLight, pressed && styles.pressedBrand]}
            onPress={() => router.push("/organizer")}
          >
            {({ pressed }) => (
              <View style={styles.compactRow}>
                <Ionicons name="settings-sharp" size={28} color={pressed ? colors.onBrand : colors.onSurface} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.compactTitle, { color: pressed ? colors.onBrand : colors.onSurface }]}>
                    ORGANIZER
                  </Text>
                  <Text style={[styles.bigBtnSub, { color: pressed ? colors.brandTertiary : colors.muted }]}>
                    Run a meet · control races
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          testID="enter-code-link"
          style={styles.codeLink}
          onPress={() => router.push("/scan?manual=1")}
        >
          <Text style={styles.codeLinkText}>HAVE A CODE? ENTER IT MANUALLY</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: { fontFamily: fonts.display, fontSize: 40, color: colors.onSurface, letterSpacing: 1 },
  tagline: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted, marginTop: spacing.xs, letterSpacing: 1 },
  body: { flex: 1, justifyContent: "center", gap: spacing.lg },
  bigBtn: {
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  btnDark: { backgroundColor: colors.inverse },
  btnLight: { backgroundColor: colors.surface },
  pressedInvert: { backgroundColor: colors.surface },
  pressedBrand: { backgroundColor: colors.brand },
  bigBtnTitle: { fontFamily: fonts.display, fontSize: type.xl3, lineHeight: type.xl3 },
  bigBtnSub: { fontFamily: fonts.body, fontSize: type.base },
  compactBtn: {
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  compactRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  compactTitle: { fontFamily: fonts.display, fontSize: type.xl2, lineHeight: type.xl2 + 2 },
  codeLink: { paddingVertical: spacing.xl, alignItems: "center" },
  codeLinkText: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onSurface, textDecorationLine: "underline" },
});
