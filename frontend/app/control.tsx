import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Share,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { colors, spacing, fonts, type } from "@/src/theme";
import { advanceMeet, previousMeet, readMeet, sendMessage, Meet, Race } from "@/src/api";

export default function Control() {
  const router = useRouter();
  const { id, passcode } = useLocalSearchParams<{ id: string; passcode: string; new?: string }>();
  const [meet, setMeet] = useState<Meet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = (code: string) => `${process.env.EXPO_PUBLIC_BACKEND_URL}/live?code=${code}`;

  const onSendMessage = async () => {
    if (!meet || !msgText.trim() || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updated = await sendMessage(meet.id, passcode!, msgText.trim());
      setMeet(updated);
      setMsgText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await readMeet(id!);
      setMeet(data);
      setError("");
    } catch (e: any) {
      setError(e.message || "Could not load meet");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onAdvance = async () => {
    if (!meet || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await advanceMeet(meet.id, passcode!);
      setMeet(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onPrevious = async () => {
    if (!meet || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updated = await previousMeet(meet.id, passcode!);
      setMeet(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onShare = () => {
    if (!meet) return;
    const link = shareLink(meet.code);
    Share.share({
      message: `Follow "${meet.name}" live on Poolside Live!\n\nTap to open: ${link}\n\nOr enter code: ${meet.code}`,
    });
  };

  const onCopyLink = async () => {
    if (!meet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(shareLink(meet.code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeDark}>
        <ActivityIndicator color={colors.onInverse} size="large" />
      </SafeAreaView>
    );
  }

  if (!meet) {
    return (
      <SafeAreaView style={styles.safeDark}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>{error || "Meet not found"}</Text>
          <Pressable testID="control-home" onPress={() => router.replace("/organizer")}>
            <Text style={styles.homeLink}>BACK</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const races = meet.races;
  const idx = meet.current_index;
  const current: Race | undefined = races[idx];
  const next: Race | undefined = races[idx + 1];
  const finished = idx >= races.length;
  const qrValue = `MEET:${meet.code}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="control-back" onPress={() => router.replace("/")} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>{meet.name.toUpperCase()}</Text>
        <Pressable testID="edit-events-link" onPress={() => router.push(`/edit-events?id=${id}&passcode=${encodeURIComponent(passcode!)}`)} hitSlop={12}>
          <Ionicons name="create-outline" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* QR + code */}
        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            <QRCode value={qrValue} size={150} color={colors.onSurface} backgroundColor={colors.surface} />
          </View>
          <View style={styles.qrInfo}>
            <Text style={styles.qrLabel}>PARENTS SCAN OR ENTER</Text>
            <Text style={styles.qrCode} testID="meet-code-display">{meet.code}</Text>
            <View style={styles.shareRow}>
              <Pressable testID="share-button" style={styles.shareBtn} onPress={onShare}>
                <Ionicons name="share-outline" size={16} color={colors.onBrand} />
                <Text style={styles.shareText}>SHARE</Text>
              </Pressable>
              <Pressable testID="copy-link-button" style={styles.copyBtn} onPress={onCopyLink}>
                <Ionicons name={copied ? "checkmark" : "link-outline"} size={16} color={colors.onSurface} />
                <Text style={styles.copyText}>{copied ? "COPIED!" : "COPY LINK"}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Current race */}
        <Text style={styles.sectionLabel}>CURRENTLY RACING</Text>
        {finished ? (
          <View style={styles.finishedCard}>
            <Ionicons name="flag" size={40} color={colors.onInverse} />
            <Text style={styles.finishedText}>MEET COMPLETE</Text>
          </View>
        ) : current ? (
          <View style={styles.currentCard} testID="control-current-card">
            <Text style={styles.progress}>RACE {idx + 1} OF {races.length}</Text>
            <Text style={styles.currentEventNo}>EVENT {current.event_number}</Text>
            <Text style={styles.currentName}>{current.event_name}</Text>
            <View style={styles.heatBadge}>
              <Text style={styles.heatBadgeText}>HEAT {current.heat_number}</Text>
            </View>
          </View>
        ) : null}

        {/* Next preview */}
        {next && (
          <View style={styles.nextPreview} testID="control-next-preview">
            <Text style={styles.nextLabel}>NEXT UP</Text>
            <Text numberOfLines={1} style={styles.nextText}>
              E{next.event_number} · {next.event_name} · HEAT {next.heat_number}
            </Text>
          </View>
        )}

        {/* Announcements */}
        <Text style={styles.sectionLabel}>SEND ANNOUNCEMENT</Text>
        <View style={styles.msgComposer}>
          <TextInput
            testID="message-input"
            value={msgText}
            onChangeText={setMsgText}
            placeholder="e.g. 10 min break after Event 13"
            placeholderTextColor={colors.muted}
            style={styles.msgInput}
            multiline
          />
          <Pressable
            testID="send-message-button"
            style={({ pressed }) => [styles.sendBtn, pressed && { backgroundColor: colors.onSurface }]}
            onPress={onSendMessage}
            disabled={sending || !msgText.trim()}
          >
            {sending ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Ionicons name="megaphone" size={22} color={colors.onBrand} />
            )}
          </Pressable>
        </View>

        {meet.messages.length > 0 && (
          <View style={styles.msgList} testID="control-message-list">
            {meet.messages.map((m) => (
              <View key={m.id} style={styles.msgItem} testID={`message-${m.id}`}>
                <Ionicons name="megaphone-outline" size={16} color={colors.brand} />
                <Text style={styles.msgItemText}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}

        {!!error && <Text testID="control-error" style={styles.errorText}>{error}</Text>}
        <View style={{ height: spacing.lg }} />
      </ScrollView>

      {/* Sticky controls */}
      <View style={styles.controls}>
        <Pressable
          testID="previous-button"
          style={({ pressed }) => [styles.prevBtn, pressed && { backgroundColor: colors.onSurface }]}
          onPress={onPrevious}
          disabled={busy || idx <= 0}
        >
          {({ pressed }) => (
            <Ionicons name="play-back" size={28} color={idx <= 0 ? colors.muted : pressed ? colors.surface : colors.onSurface} />
          )}
        </Pressable>
        <Pressable
          testID="advance-button"
          style={({ pressed }) => [styles.advanceBtn, pressed && { backgroundColor: colors.onSurface }, finished && styles.advanceDisabled]}
          onPress={onAdvance}
          disabled={busy || finished}
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.advanceText}>{finished ? "MEET DONE" : "ADVANCE TO NEXT RACE"}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  safeDark: { flex: 1, backgroundColor: colors.inverse, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: spacing.lg, padding: spacing.xl },
  errTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onInverse, textAlign: "center" },
  homeLink: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onInverse, textDecorationLine: "underline" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: type.xl2, color: colors.onSurface, letterSpacing: 0.5 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  qrCard: { flexDirection: "row", borderWidth: 2, borderColor: colors.border, alignItems: "center" },
  qrBox: { padding: spacing.md, borderRightWidth: 2, borderRightColor: colors.border },
  qrInfo: { flex: 1, padding: spacing.md, gap: spacing.xs, alignItems: "flex-start" },
  qrLabel: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.muted, letterSpacing: 1 },
  qrCode: { fontFamily: fonts.display, fontSize: type.xl3, color: colors.onSurface, letterSpacing: 2, lineHeight: type.xl3 },
  shareRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  shareText: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onBrand, letterSpacing: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  copyText: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onSurface, letterSpacing: 1 },
  sectionLabel: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.muted, letterSpacing: 2 },
  currentCard: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, padding: spacing.lg },
  progress: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.brand, letterSpacing: 2 },
  currentEventNo: { fontFamily: fonts.display, fontSize: 64, color: colors.onInverse, marginTop: spacing.sm, lineHeight: 64 },
  currentName: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onInverse, letterSpacing: 0.5 },
  heatBadge: { alignSelf: "flex-start", backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.md },
  heatBadgeText: { fontFamily: fonts.display, fontSize: type.xl, color: colors.onBrand, letterSpacing: 1 },
  finishedCard: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  finishedText: { fontFamily: fonts.display, fontSize: type.xl3, color: colors.onInverse, letterSpacing: 1 },
  nextPreview: { borderWidth: 2, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  nextLabel: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.muted, letterSpacing: 2 },
  nextText: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface },
  errorText: { fontFamily: fonts.body, fontSize: type.base, color: colors.brand },
  msgComposer: { flexDirection: "row", borderWidth: 2, borderColor: colors.border },
  msgInput: { flex: 1, fontFamily: fonts.body, fontSize: type.base, color: colors.onSurface, padding: spacing.md, minHeight: 48, maxHeight: 100 },
  sendBtn: { width: 56, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderLeftWidth: 2, borderLeftColor: colors.border },
  msgList: { gap: spacing.sm },
  msgItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 2, borderColor: colors.border, padding: spacing.md, backgroundColor: colors.brandTertiary },
  msgItemText: { flex: 1, fontFamily: fonts.bold, fontSize: type.base, color: colors.onBrandTertiary },
  controls: { flexDirection: "row", borderTopWidth: 2, borderTopColor: colors.border },
  prevBtn: { width: 72, alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg, borderRightWidth: 2, borderRightColor: colors.border, backgroundColor: colors.surface },
  advanceBtn: { flex: 1, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg },
  advanceDisabled: { backgroundColor: colors.surfaceTertiary },
  advanceText: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onBrand, letterSpacing: 1 },
});
