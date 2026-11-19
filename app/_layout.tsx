import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

// NAVIGATION GUARD: satpam yang ngecek status login tiap rute berubah
function NavigationGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // RULE 1: masih loading -> jangan redirect dulu
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // RULE 2: belum login tapi coba masuk area app -> ke login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // RULE 3: sudah login tapi masih di halaman login -> ke HQ
      router.replace("/");
    }
    // RULE 4: logout -> user jadi null -> otomatis kena RULE 2
  }, [user, isLoading, segments]);

  return (
    <View style={styles.root}>
      <Slot />
      {/* Perisai pemuatan: tutup layar sampai status user pasti (anti flicker) */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});
