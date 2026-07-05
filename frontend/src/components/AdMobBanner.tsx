import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// The AdMob native module does not exist inside Expo Go, and importing the
// package eagerly there crashes the screen (native view registration fails).
// So we detect Expo Go and NEVER touch the SDK there — we only lazy-require it
// inside a real development/production build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function AdMobBanner() {
  useEffect(() => {
    if (isExpoGo) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mobileAds = require("react-native-google-mobile-ads").default;
    mobileAds()
      .initialize()
      .catch((error: unknown) => console.warn("AdMob init error:", error));
  }, []);

  if (isExpoGo) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize, TestIds } = require("react-native-google-mobile-ads");

  // Using Google's official TEST banner ID for now.
  // Replace with your real AdMob banner Ad Unit ID before publishing for income.
  const adUnitId = TestIds.BANNER;

  return (
    <View style={styles.container} testID="admob-banner">
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error: unknown) => console.warn("Ad failed to load:", error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 2,
    borderTopColor: "#000000",
  },
});
