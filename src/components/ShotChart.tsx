import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { useWorkoutStore } from '@/store/useWorkoutStore';

export default function ShotChart() {
  const { shots } = useWorkoutStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Shot Chart</Text>

      <View style={styles.chartWrapper}>
        <Svg viewBox="0 0 100 100" style={styles.courtSvg}>
          {/* Court Background */}
          <Rect x="0" y="0" width="100" height="100" fill="#1e1e1e" rx="4" />

          {/* Court Markings */}
          <Rect x="2" y="2" width="96" height="96" fill="none" stroke="#555" strokeWidth="0.8" />
          <Rect x="34" y="2" width="32" height="38" fill="none" stroke="#555" strokeWidth="0.8" />
          <Path d="M 34,40 A 16,16 0 0,0 66,40" fill="none" stroke="#555" strokeWidth="0.8" strokeDasharray="2,2" />
          <Path d="M 34,40 A 16,16 0 0,1 66,40" fill="none" stroke="#555" strokeWidth="0.8" />
          <Path d="M 10,2 A 40,40 0 0,0 90,2" fill="none" stroke="#f5a623" strokeWidth="1.2" />
          <Rect x="42" y="6" width="16" height="0.8" fill="#fff" />
          <Circle cx="50" cy="8" r="2.5" fill="none" stroke="#ff5500" strokeWidth="1" />

          {/* Dynamic Shot Markers */}
          <G>
            {shots.map((shot) => {
              if (shot.x_coordinate === null || shot.y_coordinate === null) return null;

              return (
                <Circle
                  key={shot.id}
                  cx={shot.x_coordinate}
                  cy={shot.y_coordinate}
                  r="2"
                  fill={shot.is_made ? '#2ecc71' : '#e74c3c'}
                  opacity="0.9"
                  stroke="#fff"
                  strokeWidth="0.4"
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Legend Summary */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#2ecc71' }]} />
          <Text style={styles.legendText}>Made ({shots.filter(s => s.is_made).length})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#e74c3c' }]} />
          <Text style={styles.legendText}>Missed ({shots.filter(s => !s.is_made).length})</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  courtSvg: {
    width: '100%',
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    color: '#aaa',
    fontSize: 14,
  },
});
