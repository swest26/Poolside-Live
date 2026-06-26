import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, type } from "@/src/theme";
import { getMeet, Meet, Race } from "@/src/api";
import { storage } from "@/src/utils/storage";

export default function Live() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [meet, setMeet] = useState<Meet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);

  const favKey = `favs_${code}`;

  const load = useCallback(async () => {
    if (!code) return;
    try {
      const data = await getMeet(code);
      setMeet(data);
      setError("");
    } catch (e: any) {
      setError(e.message || "Could not load meet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [code]);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(favKey, "[]");
      try {
        setFavs(JSON.parse(stored || "[]"));
      } catch {
        setFavs([]);
      }
    })();
  }, [favKey]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const toggleFav = async (raceId: string) => {
    const next = favs.includes(raceId) ? favs.filter((f) => f !== raceId) : [...favs, raceId];
    setFavs(next);
    await storage.setItem(favKey, JSON.stringify(next));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeDark}>
        <ActivityIndicator color={colors.onInverse} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !meet) {
    return (
      <SafeAreaView style={styles.safeDark}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>{error || "Meet not found"}</Text>
          <Pressable testID="live-retry" style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
          <Pressable testID="live-home" onPress={() => router.replace("/")}>
            <Text style={styles.homeLink}>BACK TO HOME</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const races = meet.races;
  const idx = meet.current_index;
  const current: Race | undefined = races[idx];
  const upNext = races.slice(idx + 1, idx + 3);
  const finished = idx >= races.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="live-back" onPress={() => router.replace("/")} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text numberOfLines={1} style={styles.meetName}>{meet.name.toUpperCase()}</Text>
          <Text style={styles.meetCode}>CODE {meet.code}</Text>
        </View>
        <View style={styles.liveDot}>
          <View style={styles.dot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.onSurface} />}
      >
        {/* Announcements */}
        {meet.messages && meet.messages.length > 0 && (
          <View style={styles.announceWrap} testID="live-announcements">
            {meet.messages.slice(0, 3).map((m, i) => (
              <View key={m.id} style={[styles.announce, i === 0 && styles.announceLatest]} testID={`announcement-${m.id}`}>
                <Ionicons name="megaphone" size={18} color={i === 0 ? colors.onBrand : colors.brand} />
                <Text style={[styles.announceText, i === 0 && { color: colors.onBrand }]}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current race */}
        {finished ? (
          <View style={styles.finishedCard}>
            <Ionicons name="flag" size={48} color={colors.onInverse} />
            <Text style={styles.finishedText}>MEET COMPLETE</Text>
            <Text style={styles.finishedSub}>All {races.length} races have finished.</Text>
          </View>
        ) : current ? (
          <View style={[styles.currentCard, favs.includes(current.id) && styles.currentFav]} testID="current-race-card">
            <View style={styles.nowRow}>
              <Text style={styles.nowLabel}>NOW RACING</Text>
              <Pressable testID={`fav-${current.id}`} onPress={() => toggleFav(current.id)} hitSlop={10}>
                <Ionicons
                  name={favs.includes(current.id) ? "star" : "star-outline"}
                  size={26}
                  color={favs.includes(current.id) ? colors.brand : colors.onInverse}
                />
              </Pressable>
            </View>
            <Text style={styles.currentEventNo}>EVENT {current.event_number}</Text>
            <Text style={styles.currentName}>{current.event_name}</Text>
            <View style={styles.heatBadge}>
              <Text style={styles.heatBadgeText}>HEAT {current.heat_number}</Text>
            </View>
            {favs.includes(current.id) && (
              <View style={styles.favTagInline}>
                <Ionicons name="star" size={14} color={colors.onBrand} />
                <Text style={styles.favTagText}>YOUR FAVORITE IS RACING</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Up next */}
        <View style={styles.upNextHeader}>
          <Text style={styles.upNextTitle}>UP NEXT</Text>
        </View>

        {upNext.length === 0 && !finished && (
          <View style={styles.emptyNext}>
            <Text style={styles.emptyNextText}>This is the final race.</Text>
          </View>
        )}

        {upNext.map((r, i) => {
          const isFav = favs.includes(r.id);
          return (
            <View key={r.id} style={[styles.nextRow, isFav && styles.nextRowFav]} testID={`next-race-${i}`}>
              <View style={styles.nextNumBox}>
                <Text style={styles.nextNumLabel}>EVT</Text>
                <Text style={styles.nextNum}>{r.event_number}</Text>
              </View>
              <View style={styles.nextInfo}>
                <Text numberOfLines={2} style={styles.nextName}>{r.event_name}</Text>
                <View style={styles.nextMetaRow}>
                  <Text style={styles.nextHeat}>HEAT {r.heat_number}</Text>
                  {isFav && (
                    <View style={styles.favPill}>
                      <Text style={styles.favPillText}>FAVORITE</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable testID={`fav-${r.id}`} onPress={() => toggleFav(r.id)} hitSlop={10}>
                <Ionicons name={isFav ? "star" : "star-outline"} size={26} color={isFav ? colors.brand : colors.onSurface} />
              </Pressable>
            </View>
          );
        })}

        {/* Full list of favorites elsewhere in the meet */}
        <View style={styles.upNextHeader}>
          <Text style={styles.upNextTitle}>FULL SCHEDULE</Text>
          <Text style={styles.schedCount}>{races.length} RACES</Text>
        </View>
        {races.map((r, i) => {
          const isFav = favs.includes(r.id);
          const isCurrent = i === idx;
          const isPast = i < idx;
          return (
            <View
              key={r.id}
              testID={`schedule-row-${i}`}
              style={[styles.schedRow, isCurrent && styles.schedRowCurrent, isPast && styles.schedRowPast]}
            >
              <Text style={[styles.schedNum, isCurrent && { color: colors.onInverse }]}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.schedName, isCurrent && { color: colors.onInverse }, isPast && styles.pastText]}>
                  E{r.event_number} · {r.event_name}
                </Text>
                <Text style={[styles.schedHeat, isCurrent && { color: colors.surfaceTertiary }, isPast && styles.pastText]}>
                  HEAT {r.heat_number}
                </Text>
              </View>
              {isPast && <Ionicons name="checkmark-done" size={18} color={colors.muted} />}
              <Pressable testID={`fav-sched-${r.id}`} onPress={() => toggleFav(r.id)} hitSlop={10}>
                <Ionicons name={isFav ? "star" : "star-outline"} size={22} color={isFav ? colors.brand : isCurrent ? colors.onInverse : colors.muted} />
              </Pressable>
            </View>
          );
        })}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  safeDark: { flex: 1, backgroundColor: colors.inverse, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: spacing.lg, padding: spacing.xl },
  errTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onInverse, textAlign: "center" },
  retryBtn: { backgroundColor: colors.brand, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  retryText: { fontFamily: fonts.display, fontSize: type.xl, color: colors.onBrand, letterSpacing: 1 },
  homeLink: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onInverse, textDecorationLine: "underline" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  meetName: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onSurface, letterSpacing: 0.5 },
  meetCode: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted, letterSpacing: 1 },
  liveDot: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.brand, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onBrand },
  liveText: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onBrand, letterSpacing: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  announceWrap: { gap: spacing.sm, marginBottom: spacing.lg },
  announce: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 2, borderColor: colors.brand, padding: spacing.md, backgroundColor: colors.brandTertiary },
  announceLatest: { backgroundColor: colors.brand, borderColor: colors.border },
  announceText: { flex: 1, fontFamily: fonts.bold, fontSize: type.base, color: colors.onBrandTertiary },
  currentCard: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, padding: spacing.lg },
  currentFav: { borderColor: colors.brand, borderWidth: 4 },
  nowRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nowLabel: { fontFamily: fonts.bold, fontSize: type.base, color: colors.brand, letterSpacing: 2 },
  currentEventNo: { fontFamily: fonts.display, fontSize: 64, color: colors.onInverse, marginTop: spacing.sm, lineHeight: 64 },
  currentName: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onInverse, letterSpacing: 0.5 },
  heatBadge: { alignSelf: "flex-start", backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.md },
  heatBadgeText: { fontFamily: fonts.display, fontSize: type.xl, color: colors.onBrand, letterSpacing: 1 },
  favTagInline: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md, backgroundColor: colors.brand, alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  favTagText: { fontFamily: fonts.bold, fontSize: type.sm, color: colors.onBrand, letterSpacing: 1 },
  finishedCard: { backgroundColor: colors.inverse, borderWidth: 2, borderColor: colors.border, padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  finishedText: { fontFamily: fonts.display, fontSize: type.xl3, color: colors.onInverse, letterSpacing: 1 },
  finishedSub: { fontFamily: fonts.body, fontSize: type.base, color: colors.surfaceTertiary },
  upNextHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border, paddingBottom: spacing.xs },
  upNextTitle: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onSurface, letterSpacing: 1 },
  schedCount: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted },
  emptyNext: { padding: spacing.lg, borderWidth: 2, borderColor: colors.surfaceTertiary },
  emptyNextText: { fontFamily: fonts.body, fontSize: type.base, color: colors.muted },
  nextRow: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  nextRowFav: { borderColor: colors.brand, borderWidth: 3 },
  nextNumBox: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: "center", borderWidth: 2, borderColor: colors.border },
  nextNumLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted, letterSpacing: 1 },
  nextNum: { fontFamily: fonts.display, fontSize: type.xl2, color: colors.onSurface, lineHeight: type.xl2 },
  nextInfo: { flex: 1 },
  nextName: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface },
  nextMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  nextHeat: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted, letterSpacing: 1 },
  favPill: { backgroundColor: colors.brand, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  favPillText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onBrand, letterSpacing: 1 },
  schedRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceTertiary },
  schedRowCurrent: { backgroundColor: colors.inverse, paddingHorizontal: spacing.md, borderBottomColor: colors.border },
  schedRowPast: { opacity: 0.6 },
  schedNum: { fontFamily: fonts.display, fontSize: type.xl, color: colors.muted, width: 44 },
  schedName: { fontFamily: fonts.bold, fontSize: type.base, color: colors.onSurface },
  schedHeat: { fontFamily: fonts.body, fontSize: type.sm, color: colors.muted, letterSpacing: 1 },
  pastText: { color: colors.muted },
});
