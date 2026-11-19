import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 1.1 TYPES & INTERFACES
export interface Mission {
  id: string;
  user_id: string;
  title: string;
  reward_points: number;
  status: "pending" | "completed";
  created_at: string;
}

// syncing = true -> misi optimistic yang belum dikonfirmasi server
type MissionItem = Mission & { syncing?: boolean };

export default function MissionBoard() {
  const { user } = useAuth();

  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPoints, setNewPoints] = useState("150");
  const [signingOut, setSigningOut] = useState(false);

  // 2.1 SELECT: ambil misi (RLS di database otomatis cuma kasih baris milik user ini)
  const fetchMissions = useCallback(async () => {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(`Failed to fetch missions: ${error.message}`);
      return;
    }
    setErrorMessage("");
    setMissions((data ?? []) as Mission[]);
  }, []);

  // Load awal (dan ulang kalau user ganti akun)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMissions();
      setLoading(false);
    };
    init();
  }, [fetchMissions, user?.id]);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    setRefreshing(false);
  };

  // 2.2 INSERT + OPTIMISTIC UI
  const handleDispatch = async () => {
    const title = newTitle.trim();
    if (!user) return;
    if (!title) {
      setErrorMessage("Mission objective tidak boleh kosong.");
      return;
    }

    const parsed = parseInt(newPoints, 10);
    const rewardPoints = Number.isNaN(parsed) || parsed < 0 ? 100 : parsed;

    // a) Tampilkan dulu di UI (tanda ⏳), jangan nunggu server
    const tempId = `temp-${Date.now()}`;
    const optimistic: MissionItem = {
      id: tempId,
      user_id: user.id,
      title,
      reward_points: rewardPoints,
      status: "pending",
      created_at: new Date().toISOString(),
      syncing: true,
    };
    setMissions((prev) => [optimistic, ...prev]);
    setNewTitle("");
    setErrorMessage("");

    // b) Kirim ke Supabase (user_id WAJIB dari user yang sedang login)
    const { data, error } = await supabase
      .from("missions")
      .insert([{ title, reward_points: rewardPoints, user_id: user.id }])
      .select()
      .single();

    if (error) {
      // c) ROLLBACK kalau gagal
      setMissions((prev) => prev.filter((m) => m.id !== tempId));
      setNewTitle(title);
      setErrorMessage(`Failed to create mission: ${error.message}`);
      return;
    }

    // d) Ganti item sementara dengan data asli dari database
    setMissions((prev) =>
      prev.map((m) => (m.id === tempId ? (data as Mission) : m)),
    );
  };

  // 2.3 UPDATE: ketuk chip status buat toggle pending <-> completed
  const handleToggle = async (mission: MissionItem) => {
    if (mission.syncing) return;
    const next = mission.status === "pending" ? "completed" : "pending";

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? { ...m, status: next } : m)),
    );

    const { error } = await supabase
      .from("missions")
      .update({ status: next })
      .eq("id", mission.id);

    if (error) {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === mission.id ? { ...m, status: mission.status } : m,
        ),
      );
      setErrorMessage(`Failed to update mission: ${error.message}`);
    }
  };

  // 2.4 DELETE + OPTIMISTIC UI
  const handleDelete = async (mission: MissionItem) => {
    if (mission.syncing) return;

    setMissions((prev) => prev.filter((m) => m.id !== mission.id));

    const { error } = await supabase
      .from("missions")
      .delete()
      .eq("id", mission.id);

    if (error) {
      // rollback: balikin item, urut lagi berdasarkan created_at
      setMissions((prev) =>
        [mission, ...prev].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        ),
      );
      setErrorMessage(`Failed to delete mission: ${error.message}`);
    }
  };

  // SIGN OUT -> guard otomatis lempar ke login
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out error:", error.message);
    setSigningOut(false);
  };

  const callsign = user?.user_metadata?.callsign ?? user?.email ?? "Operative";

  // 3. RENDER
  const renderMission = ({ item }: { item: MissionItem }) => {
    const done = item.status === "completed";
    return (
      <View style={styles.missionRow}>
        <TouchableOpacity
          style={[styles.statusChip, done && styles.statusChipDone]}
          onPress={() => handleToggle(item)}
          disabled={item.syncing}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.statusChipText, done && styles.statusChipTextDone]}
          >
            {item.syncing ? "⏳ SYNC" : done ? "✓ DONE" : "● ACTIVE"}
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={[styles.missionTitle, done && styles.missionTitleDone]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={styles.missionXp}>+{item.reward_points} XP</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          disabled={item.syncing}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const header = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hqBadge}>● COMMAND HQ ACTIVE</Text>
          <Text style={styles.callsign}>{callsign}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.signOutBtn, signingOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dispatch form */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DISPATCH NEW MISSION</Text>
        <TextInput
          style={styles.input}
          placeholder="Mission objective..."
          placeholderTextColor="#666666"
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleDispatch}
        />
        <View style={styles.dispatchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="XP"
            placeholderTextColor="#666666"
            value={newPoints}
            onChangeText={setNewPoints}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.dispatchBtn}
            onPress={handleDispatch}
            activeOpacity={0.8}
          >
            <Text style={styles.dispatchBtnText}>Dispatch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>TACTICAL MISSIONS</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{missions.length} QUEUED</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Syncing with HQ...</Text>
        </View>
      ) : (
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={renderMission}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No active missions</Text>
              <Text style={styles.emptySub}>
                All sectors are secure. Dispatch a new objective above.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { color: "#a3a3a3", fontSize: 12 },
  listContent: {
    padding: 20,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: 10,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  hqBadge: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  callsign: { color: "#ffffff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  email: { color: "#737373", fontSize: 11, marginTop: 2 },
  signOutBtn: {
    backgroundColor: "#171717",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  signOutText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 10,
  },
  sectionLabel: {
    color: "#737373",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#171717",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    fontSize: 14,
  },
  dispatchRow: { flexDirection: "row", gap: 10 },
  dispatchBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 22,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dispatchBtnText: { color: "#000000", fontWeight: "700", fontSize: 14 },

  errorBox: {
    backgroundColor: "#1a0f0f",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    marginTop: 12,
  },
  errorText: { color: "#fca5a5", fontSize: 12 },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  countPill: {
    backgroundColor: "#171717",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: { color: "#a3a3a3", fontSize: 10, fontWeight: "800" },

  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 12,
  },
  statusChip: {
    backgroundColor: "#171717",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333333",
  },
  statusChipDone: { backgroundColor: "#052e16", borderColor: "#166534" },
  statusChipText: { color: "#d4d4d4", fontSize: 10, fontWeight: "800" },
  statusChipTextDone: { color: "#86efac" },
  missionTitle: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  missionTitleDone: { color: "#737373", textDecorationLine: "line-through" },
  missionXp: { color: "#737373", fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { color: "#737373", fontSize: 14, fontWeight: "800" },

  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 4 },
  emptyTitle: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  emptySub: { color: "#737373", fontSize: 12, textAlign: "center" },
});
