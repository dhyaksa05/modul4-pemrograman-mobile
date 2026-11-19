// 1.1 IMPORT SECTION
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  // 1.2 STATE DECLARATION
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [callsign, setCallsign] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Pulihkan sesi kalau halaman di-refresh (token dibaca dari storage)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null);
    });
  }, []);

  // 1.3 CORE AUTHENTICATION ENGINE (CODELAB 3 CHALLENGE)
  const handleAuth = async () => {
    if (loading) return; // cegah double submit

    // 2.1 SANITIZE INPUTS & VALIDATION
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanCallsign = callsign.trim();

    if (!cleanEmail || !cleanPassword) {
      setStatusMessage("Please provide both an email and password to proceed.");
      return;
    }

    if (isRegistering && !cleanCallsign) {
      setStatusMessage(
        "Every operative in the field needs a tactical callsign!",
      );
      return;
    }

    setLoading(true);
    setStatusMessage("");
    try {
      if (isRegistering) {
        // 2.2 SIGN UP: RECRUIT NEW OPERATIVE (WITH METADATA)
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              callsign: cleanCallsign,
              role: "hero",
            },
          },
        });

        if (error) {
          setStatusMessage(error.message);
        } else {
          // signUp (tanpa konfirmasi email) otomatis bikin sesi.
          // Kita keluarkan dulu supaya alurnya: daftar -> sign in manual.
          setStatusMessage(
            "Enlistment successful! Credentials registered. Sign in to enter HQ.",
          );
          setIsRegistering(false);
          setPassword("");
        }
      } else {
        // 2.3 SIGN IN: AUTHENTICATE RETURNING HERO
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          setStatusMessage(error.message); // contoh: "Invalid login credentials"
        } else {
          setCurrentUser(data.user);
          setPassword("");
          setStatusMessage("Access Granted. Welcome back, Operative!");
        }
      }
    } catch (err: any) {
      setStatusMessage("Unable to establish communication with HQ.");
      console.error("Auth Exception:", err);
    } finally {
      setLoading(false);
    }
  };

  // SIGN OUT: batalkan sesi cloud + hapus token dari storage lokal
  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setStatusMessage("Signed out. HQ locked.");
    } catch (err: any) {
      setStatusMessage(err?.message ?? "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  // 1.4 MAIN UI RENDER
  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardWrapper}>
          {currentUser ? (
            // ===== TAMPILAN SETELAH LOGIN: OPERATIVE ACTIVE =====
            <>
              <View style={styles.headerArea}>
                <Text style={styles.badgeText}>CODELAB 3: AUTHENTICATION</Text>
                <Text style={styles.headingTitle}>Operative Active</Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.infoBox}>
                  <Text style={styles.inputLabel}>CALLSIGN</Text>
                  <Text style={styles.infoValue}>
                    {currentUser.user_metadata?.callsign ?? "-"}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.inputLabel}>EMAIL</Text>
                  <Text style={styles.infoValue}>{currentUser.email}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.inputLabel}>ROLE</Text>
                  <Text style={styles.infoValue}>
                    {currentUser.user_metadata?.role ?? "-"}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.inputLabel}>USER UID</Text>
                  <Text style={styles.uidValue}>{currentUser.id}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.outlineBtn, loading && { opacity: 0.6 }]}
                  onPress={handleSignOut}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.outlineBtnText}>Sign Out of HQ</Text>
                  )}
                </TouchableOpacity>

                {!!statusMessage && (
                  <View style={styles.statusBox}>
                    <Text style={styles.statusText}>{statusMessage}</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            // ===== TAMPILAN FORM LOGIN / REGISTER =====
            <>
              <View style={styles.headerArea}>
                <Text style={styles.badgeText}>CODELAB 3: AUTHENTICATION</Text>
                <Text style={styles.headingTitle}>
                  {isRegistering ? "Hero Recruitment" : "Command HQ Sign In"}
                </Text>
              </View>

              <View style={styles.formCard}>
                {isRegistering && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TACTICAL CALLSIGN</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. ShadowRunner, Cipher"
                      placeholderTextColor="#666666"
                      value={callsign}
                      onChangeText={setCallsign}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>OPERATIVE EMAIL</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="operative@hero.hq"
                    placeholderTextColor="#666666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ACCESS PASSWORD</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Min. 6 characters..."
                    placeholderTextColor="#666666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isRegistering
                        ? "Enlist as Hero"
                        : "Authenticate & Enter HQ"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => {
                    setIsRegistering(!isRegistering);
                    setStatusMessage("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchModeText}>
                    {isRegistering
                      ? "Already have credentials? Sign in here"
                      : "Need field credentials? Register here"}
                  </Text>
                </TouchableOpacity>

                {!!statusMessage && (
                  <View style={styles.statusBox}>
                    <Text style={styles.statusText}>{statusMessage}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 1.5 STYLESHEET SECTION (MONOCHROME THEME)
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    padding: 24,
    justifyContent: "center",
    flexGrow: 1,
  },
  cardWrapper: {
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  headerArea: {
    marginBottom: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headingTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: "#737373",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: "#171717",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 14,
  },
  outlineBtn: {
    backgroundColor: "#171717",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
    marginTop: 6,
  },
  outlineBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  switchModeBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  switchModeText: {
    color: "#a3a3a3",
    fontSize: 13,
    fontWeight: "600",
  },
  statusBox: {
    backgroundColor: "#171717",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  statusText: {
    color: "#d4d4d4",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: "#171717",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 4,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  uidValue: {
    color: "#d4d4d4",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
});
