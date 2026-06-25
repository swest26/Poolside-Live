import { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, type } from "@/src/theme";
import { getMeet } from "@/src/api";

export default function Scan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(params.manual === "1");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!manual && permission && !permission.granted) {
      requestPermission();
    }
  }, [manual, permission]);

  const resolveCode = async (raw: string) => {
    let value = raw.trim();
    if (value.toUpperCase().startsWith("MEET:")) value = value.slice(5);
    // handle a possible deep link form like .../live?code=XXXX
    const m = value.match(/code=([A-Za-z0-9]+)/);
    if (m) value = m[1];
    value = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!value) {
      setError("Enter a valid meet code");
      return;
    }
    setChecking(true);
    setError("");
    try {
      await getMeet(value);
      router.replace(`/live?code=${value}`);
    } catch (e: any) {
      setError(e.message || "Meet not found");
      lockRef.current = false;
    } finally {
      setChecking(false);
    }
  };

  const onScanned = ({ data }: { data: string }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    resolveCode(data);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="scan-back-button" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={28} color={colors.onInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>JOIN A MEET</Text>
        <Pressable testID="toggle-manual-button" onPress={() => setManual((m) => !m)} hitSlop={12}>
          <Ionicons name={manual ? "qr-code" : "keypad"} size={26} color={colors.onInverse} />
        </Pressable>
      </View>

      {manual ? (
        <KeyboardAvoidingView
          style={styles.manualWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Text style={styles.label}>ENTER MEET CODE</Text>
          <TextInput
            testID="manual-code-input"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={styles.codeInput}
          />
          {!!error && <Text testID="scan-error" style={styles.errorText}>{error}</Text>}
          <Pressable
            testID="manual-join-button"
            style={({ pressed }) => [styles.joinBtn, pressed && { backgroundColor: colors.surface }]}
            onPress={() => resolveCode(code)}
            disabled={checking}
          >
            {({ pressed }) =>
              checking ? (
                <ActivityIndicator color={pressed ? colors.onSurface : colors.onInverse} />
              ) : (
                <Text style={[styles.joinBtnText, { color: pressed ? colors.onSurface : colors.onInverse }]}>
                  GO TO MEET
                </Text>
              )
            }
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.cameraWrap}>
          {permission?.granted ? (
            <CameraView
              testID="qr-camera"
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onScanned}
            />
          ) : (
            <View style={styles.permWrap}>
              <Ionicons name="camera-outline" size={48} color={colors.onInverse} />
              <Text style={styles.permText}>Camera access is needed to scan the meet QR code.</Text>
              <Pressable testID="grant-camera-button" style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>ALLOW CAMERA</Text>
              </Pressable>
              <Pressable testID="use-code-instead" onPress={() => setManual(true)}>
                <Text style={styles.useCode}>USE A CODE INSTEAD</Text>
              </Pressable>
            </View>
          )}
          {permission?.granted && (
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.scanHint}>POINT AT THE MEET QR CODE</Text>
              {checking && <ActivityIndicator color={colors.onInverse} style={{ marginTop: spacing.lg }} />}
              {!!error && <Text style={styles.scanError}>{error}</Text>}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.inverse },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onInverse, letterSpacing: 1 },
  manualWrap: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.md },
  label: { fontFamily: fonts.bold, fontSize: type.base, color: colors.surfaceTertiary, letterSpacing: 1 },
  codeInput: {
    fontFamily: fonts.display,
    fontSize: 64,
    color: colors.onInverse,
    borderWidth: 2,
    borderColor: colors.onInverse,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    letterSpacing: 4,
    textAlign: "center",
  },
  errorText: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand },
  joinBtn: {
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.onInverse,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  joinBtnText: { fontFamily: fonts.display, fontSize: type.xl2, letterSpacing: 1 },
  cameraWrap: { flex: 1, backgroundColor: "#000" },
  permWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  permText: { fontFamily: fonts.body, fontSize: type.lg, color: colors.onInverse, textAlign: "center" },
  permBtn: { backgroundColor: colors.brand, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  permBtnText: { fontFamily: fonts.display, fontSize: type.xl, color: colors.onBrand, letterSpacing: 1 },
  useCode: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onInverse, textDecorationLine: "underline" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: 240, height: 240, borderWidth: 4, borderColor: colors.brand },
  scanHint: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onInverse, marginTop: spacing.lg, letterSpacing: 1 },
  scanError: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand, marginTop: spacing.md },
});
