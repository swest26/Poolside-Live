import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

// The AdMob native module is not present inside Expo Go, so guard against it
// (renders nothing there). It DOES work in a development/production build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function AdMobBanner() {
  useEffect(() => {
    if (isExpoGo) return;
    mobileAds()
      .initialize()
      .catch((error: unknown) => console.warn("AdMob init error:", error));
  }, []);

  if (isExpoGo) return null;

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
