import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAIEngine } from '@/hooks/useAIEngine';
import { yoloParser } from '@/utils/yoloParser';
import { imagePreprocessor } from '@/utils/imagePreprocessor';
import { highlightService } from '@/services/highlightService';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ShotType } from '@/types/database.types';

export default function LiveWorkoutScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { isModelLoaded, processFrame } = useAIEngine();
  const { currentSession, startSession, endSession, addShot } = useWorkoutStore();
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const isProcessingFrame = useRef(false);
  const isModelLoading = !isModelLoaded;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCameraFrameMock = useCallback(async () => {
    if (isProcessingFrame.current || isModelLoading || !currentSession) return;
    isProcessingFrame.current = true;

    try {
      // 1. Mock raw frame payload structure matching device aspect ratios
      const mockBuffer = new Uint8Array(1280 * 720 * 3);
      const width = 1280;
      const height = 720;

      // 2. Transformation to Planar CHW [1, 3, 640, 640]
      const tensor = imagePreprocessor.transformFrameToTensor(mockBuffer, width, height);

      // 3. ONNX Inference execution
      const outputMap = await processFrame(tensor);

      if (outputMap) {
        // 4. Extract boxes and filter via NMS
        const candidateBoxes = yoloParser.parseOutputs(outputMap, 0.5);
        const finalizedDetections = yoloParser.applyNMS(candidateBoxes, 0.45);

        // 5. Intelligent Shot State Monitoring
        if (isWorkoutActive && finalizedDetections.length > 0) {
          const ballBox = finalizedDetections.find(b => b.classLabel === 'ball');
          const rimBox = finalizedDetections.find(b => b.classLabel === 'rim');
          const playerBox = finalizedDetections.find(b => b.classLabel === 'player');

          const isNearRim = (box: typeof ballBox) => {
            if (!box || !rimBox) return false;
            const boxCenterX = box.x + box.width / 2;
            const boxCenterY = box.y + box.height / 2;
            const rimCenterX = rimBox.x + rimBox.width / 2;
            const rimCenterY = rimBox.y + rimBox.height / 2;
            const distance = Math.hypot(boxCenterX - rimCenterX, boxCenterY - rimCenterY);
            return distance < Math.max(rimBox.width, rimBox.height) * 2;
          };

          const hasBallNearRim = ballBox && isNearRim(ballBox);
          const hasPlayerNearRim = playerBox && isNearRim(playerBox);

          if (hasBallNearRim || hasPlayerNearRim) {
            const currentShotId = `shot_${Date.now()}`;

            // Sequence trigger: Start video tracking frame buffer
            await highlightService.startAttemptBuffer(currentShotId);

            // Simulation of physical success evaluation logic (e.g., net penetration)
            const wasShotSuccessful = Math.random() > 0.4;
            const clip = await highlightService.finalizeTrackedShot(currentShotId, wasShotSuccessful);

            if (wasShotSuccessful) {
              const shotType: ShotType = Math.random() > 0.5 ? '3PT' : '2PT';
              addShot({
                id: currentShotId,
                session_id: currentSession.id,
                player_id: null,
                anonymous_player_tag: 'Player 1',
                is_made: true,
                shot_type: shotType,
                x_coordinate: 150 + Math.random() * 50,
                y_coordinate: 200 + Math.random() * 50,
                arc_height: null,
                release_speed: null,
                release_point_y: null,
                timestamp_in_video: Date.now() / 1000,
                created_at: new Date().toISOString(),
              });

              console.log(`[LiveWorkout] Shot MADE logged${clip ? ` with clip: ${clip.videoUri}` : ''}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Frame processing failure:', err);
    } finally {
      isProcessingFrame.current = false;
    }
  }, [addShot, currentSession, isModelLoading, isWorkoutActive, processFrame]);

  // Continuous frame scanning loop hook when active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        handleCameraFrameMock();
      }, 100); // 10 FPS analytical sweep
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkoutActive, handleCameraFrameMock]);

  const toggleWorkoutSession = () => {
    if (isWorkoutActive) {
      endSession(new Date().toISOString());
      setIsWorkoutActive(false);
    } else {
      startSession({
        id: Math.random().toString(36).substring(7),
        creator_id: null,
        start_time: new Date().toISOString(),
        end_time: null,
        court_type: 'Full Court',
        status: 'recording',
        video_url: null,
        thumbnail_url: null,
        is_synced: false,
        created_at: new Date().toISOString(),
      });
      setIsWorkoutActive(true);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f5a623" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Camera access is required to analyze shots.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" />

      {/* Target UI Overlays */}
      <View style={styles.overlayContainer}>
        {isModelLoading && (
          <View style={styles.loadingTag}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Loading Neural Engine...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.actionButton, isWorkoutActive ? styles.btnStop : styles.btnStart]}
          onPress={toggleWorkoutSession}
        >
          <Text style={styles.actionButtonText}>
            {isWorkoutActive ? 'Stop Session' : 'Start AI Workout'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 40,
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  btnStart: {
    backgroundColor: '#f5a623',
  },
  btnStop: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingTag: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: '#f5a623',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
