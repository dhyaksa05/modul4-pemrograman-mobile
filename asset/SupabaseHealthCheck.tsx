import React, { useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function SupabaseHealthCheck() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const targetUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "(env kosong)";

  const testCloudBridge = async () => {
    try {
      setLoading(true);
      setStatus("");

      // Coba query ke tabel missions (tabelnya baru dibuat di Codelab 5)
      const { error } = await supabase.from("missions").select("id").limit(1);

      if (error) {
        // PGRST205 / 42P01 = tabel belum ada, tapi koneksi ke cloud BERHASIL
        const tableMissing =
          error.code === "PGRST205" ||
          error.code === "42P01" ||
          /missions/i.test(error.message);

        if (tableMissing) {
          setStatus(
            "Connected to Supabase! (Note: Table 'missions' not created yet. Run the SQL in Codelab 5.)",
          );
        } else {
          setStatus(`Database Error: ${error.message}`);
        }
        return;
      }

      setStatus("Connected to Supabase! Table 'missions' ready.");
    } catch (e: any) {
      // Contoh: "TypeError: Failed to fetch" kalau URL salah / internet mati
      setStatus(`Database Error: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>CODELAB 2: CLOUD BRIDGE</Text>
        <Text style={styles.title}>Supabase Health Check</Text>

        <View style={styles.urlBox}>
          <Text style={styles.urlLabel}>TARGET URL</Text>
          <Text style={styles.urlValue}>{targetUrl}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={testCloudBridge}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Test Cloud Bridge</Text>
          )}
        </TouchableOpacity>

        {!!status && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  eyebrow: {
    color: "#888",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginVertical: 10,
  },
  urlBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  urlLabel: { color: "#888", fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  urlValue: { color: "#fff", fontSize: 12 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { color: "#000", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  statusBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statusText: { color: "#ccc", fontSize: 12, textAlign: "center" },
});
