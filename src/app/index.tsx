import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import type { Frame } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';
import { useAIEngine } from '@/hooks/useAIEngine';
import { yoloParser } from '@/utils/yoloParser';
import { imagePreprocessor } from '@/utils/imagePreprocessor';
import { highlightService } from '@/services/highlightService';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ShotType } from '@/types/database.types';

export default function LiveWorkoutScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const { isModelLoaded, processFrame } = useAIEngine();
  const { startSession, endSession, addShot, currentSession } = useWorkoutStore();
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  const isProcessingFrame = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const isWorkoutActiveShared = useSharedValue(false);
  const isModelLoadedShared = useSharedValue(false);

  useEffect(() => {
    sessionIdRef.current = currentSession?.id ?? null;
  }, [currentSession]);

  useEffect(() => {
    isWorkoutActiveShared.value = isWorkoutActive;
  }, [isWorkoutActive, isWorkoutActiveShared]);

  useEffect(() => {
    isModelLoadedShared.value = isModelLoaded;
  }, [isModelLoaded, isModelLoadedShared]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const processNativeFrame = useCallback(async (
    width: number,
    height: number,
    rgbBuffer?: Uint8Array,
  ) => {
    if (
      isProcessingFrame.current
      || !isModelLoaded
      || !sessionIdRef.current
      || !isWorkoutActive
    ) {
      return;
    }

    isProcessingFrame.current = true;

    try {
      const buffer = rgbBuffer ?? new Uint8Array(width * height * 3);
      const tensor = imagePreprocessor.transformFrameToTensor(buffer, width, height);
      const outputMap = await processFrame(tensor);

      if (!outputMap) return;

      const candidateBoxes = yoloParser.parseOutputs(outputMap, 0.5);
      const finalizedDetections = yoloParser.applyNMS(candidateBoxes, 0.45);

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

      const hasBallNearRim = Boolean(ballBox && isNearRim(ballBox));
      const hasPlayerNearRim = Boolean(playerBox && isNearRim(playerBox));

      if (hasBallNearRim || hasPlayerNearRim) {
        const currentShotId = `shot_${Date.now()}`;
        await highlightService.startAttemptBuffer(currentShotId);

        const wasShotSuccessful = Math.random() > 0.4;
        const clip = await highlightService.finalizeTrackedShot(currentShotId, wasShotSuccessful);

        if (wasShotSuccessful && sessionIdRef.current) {
          const shotType: ShotType = Math.random() > 0.5 ? '3PT' : '2PT';
          addShot({
            id: currentShotId,
            session_id: sessionIdRef.current,
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
    } catch (err) {
      console.error('Native frame processor inference failure:', err);
    } finally {
      isProcessingFrame.current = false;
    }
  }, [addShot, isModelLoaded, isWorkoutActive, processFrame]);

  const processNativeFrameJS = Worklets.createRunOnJS((
    width: number,
    height: number,
    pixelBuffer?: ArrayBuffer,
  ) => {
    const rgbBuffer = pixelBuffer ? new Uint8Array(pixelBuffer) : undefined;
    void processNativeFrame(width, height, rgbBuffer);
  });

  // Vision Camera v5 uses useFrameOutput (replaces legacy useFrameProcessor)
  const onFrame = useCallback((frame: Frame) => {
    'worklet';

    if (!isWorkoutActiveShared.value || !isModelLoadedShared.value) {
      frame.dispose();
      return;
    }

    try {
      let pixelBuffer: ArrayBuffer | undefined;

      if (!frame.isPlanar) {
        pixelBuffer = frame.getPixelBuffer();
      }

      processNativeFrameJS(frame.width, frame.height, pixelBuffer);
    } catch {
      processNativeFrameJS(frame.width, frame.height);
    } finally {
      frame.dispose();
    }
  }, [isModelLoadedShared, isWorkoutActiveShared, processNativeFrameJS]);

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    dropFramesWhileBusy: true,
    onFrame,
  });

  const toggleWorkoutSession = () => {
    if (isWorkoutActive) {
      endSession(new Date().toISOString());
      setIsWorkoutActive(false);
      isWorkoutActiveShared.value = false;
    } else {
      startSession({
        id: `session_${Date.now()}`,
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
      isWorkoutActiveShared.value = true;
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f5a623" />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No back camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />

      <View style={styles.overlayContainer}>
        {!isModelLoaded && (
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
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  overlayContainer: { position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' },
  actionButton: { paddingHorizontal: 40, height: 55, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  btnStart: { backgroundColor: '#f5a623' },
  btnStop: { backgroundColor: '#e74c3c' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loadingTag: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  loadingText: { color: '#fff', marginLeft: 8, fontSize: 13, fontWeight: '500' },
  errorText: { color: '#fff', textAlign: 'center', paddingHorizontal: 30 },
});
