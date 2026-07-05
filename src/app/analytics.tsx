import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAuth } from '@/hooks/useAuth';
import { syncService } from '@/services/syncService';
import ShotChart from '@/components/ShotChart';

export default function AnalyticsDashboard() {
  const { currentSession, shots } = useWorkoutStore();
  const { profile } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Core Calculations
  const totalShots = shots.length;
  const totalMakes = shots.filter(s => s.is_made).length;
  const shootingPercentage = totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;

  // Breakdown Calculations
  const getBreakdown = (type: '3PT' | '2PT' | 'Free Throw') => {
    const typeShots = shots.filter(s => s.shot_type === type);
    const makes = typeShots.filter(s => s.is_made).length;
    const pct = typeShots.length > 0 ? Math.round((makes / typeShots.length) * 100) : 0;
    return { attempts: typeShots.length, makes, pct };
  };

  const stats3M = getBreakdown('3PT');
  const stats2M = getBreakdown('2PT');
  const statsFT = getBreakdown('Free Throw');

  async function handleCloudSync() {
    if (!currentSession) return;
    setIsSyncing(true);
    setSyncStatus('idle');

    const result = await syncService.syncSessionToCloud(currentSession, shots, profile);

    setIsSyncing(false);
    if (result.success) {
      setSyncStatus('success');
      // Optional: clearWorkout(); // Clear local state after successful cloud upload
    } else {
      setSyncStatus('error');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Workout Summary</Text>

      {/* Main Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreValue}>{shootingPercentage}%</Text>
          <Text style={styles.scoreLabel}>FG Percentage</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreItem}>
          <Text style={styles.scoreValue}>{totalMakes}/{totalShots}</Text>
          <Text style={styles.scoreLabel}>Shots Made</Text>
        </View>
      </View>

      {/* Visual Shot Chart Overlay */}
      <ShotChart />

      {/* Breakdown Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Type Breakdown</Text>

        {/* 3PT Row */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>3-Point Field Goals</Text>
          <Text style={styles.rowValue}>{stats3M.makes}/{stats3M.attempts} ({stats3M.pct}%)</Text>
        </View>

        {/* 2PT Row */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Mid-Range / Paint</Text>
          <Text style={styles.rowValue}>{stats2M.makes}/{stats2M.attempts} ({stats2M.pct}%)</Text>
        </View>

        {/* FT Row */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Free Throws</Text>
          <Text style={styles.rowValue}>{statsFT.makes}/{statsFT.attempts} ({statsFT.pct}%)</Text>
        </View>
      </View>

      {/* Sync Control Button */}
      {currentSession && (
        <TouchableOpacity
          style={[styles.syncButton, syncStatus === 'success' ? styles.btnSuccess : styles.btnPrimary]}
          onPress={handleCloudSync}
          disabled={isSyncing || syncStatus === 'success'}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>
              {syncStatus === 'success' ? '✓ Synced to Cloud' : 'Sync Workout to Cloud'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {syncStatus === 'error' && (
        <Text style={styles.errorText}>Sync failed. Please check network connection and try again.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  scoreboard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3a3a3c',
  },
  section: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#3a3a3c',
  },
  rowLabel: {
    color: '#e5e5ea',
    fontSize: 14,
  },
  rowValue: {
    color: '#f5a623',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  btnPrimary: {
    backgroundColor: '#f5a623',
  },
  btnSuccess: {
    backgroundColor: '#2ecc71',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
});
