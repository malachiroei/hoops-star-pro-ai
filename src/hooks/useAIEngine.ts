import { useState, useEffect } from 'react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ShotType, Shot } from '@/types/database.types';
import { onnxEngine } from '@/utils/onnxEngine';
import { Tensor } from 'onnxruntime-react-native';

export function useAIEngine() {
  const { currentSession, addShot } = useWorkoutStore();
  const [activePlayersCount, setActivePlayersCount] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Automatically load the YOLOv12 ONNX model on mount
  useEffect(() => {
    async function initModel() {
      await onnxEngine.loadModel();
      setIsModelLoaded(true);
    }
    initModel();
  }, []);

  /**
   * Process a single camera frame tensor through the ONNX engine
   */
  const processFrame = async (inputTensor: Tensor) => {
    if (!isModelLoaded) return null;

    // Execute YOLOv12 on-device inference
    const output = await onnxEngine.runInference(inputTensor);

    if (output) {
      // Future processing: Parse bounding boxes, run tracking, detect shot events
      // For now, return raw model output
      return output;
    }
    return null;
  };

  // Triggered when a shot attempt event is completed
  const handleDetectedShot = (
    playerId: string | null,
    anonymousTag: string | null,
    shotType: ShotType,
    isMade: boolean,
    coordinates: { x: number; y: number },
    biomechanics: { arcHeight: number; releaseSpeed: number; jumpHeight: number },
    videoTimestamp: number
  ) => {
    if (!currentSession) return;

    const newShot: Shot = {
      id: Math.random().toString(36).substring(7),
      session_id: currentSession.id,
      player_id: playerId,
      anonymous_player_tag: anonymousTag,
      shot_type: shotType,
      is_made: isMade,
      x_coordinate: coordinates.x,
      y_coordinate: coordinates.y,
      arc_height: biomechanics.arcHeight,
      release_speed: biomechanics.releaseSpeed,
      release_point_y: biomechanics.jumpHeight,
      timestamp_in_video: videoTimestamp,
      created_at: new Date().toISOString(),
    };

    addShot(newShot);
    console.log(`[AI Engine] Shot Logged: ${shotType} - ${isMade ? 'MAKE' : 'MISS'}`);
  };

  return {
    processFrame,
    handleDetectedShot,
    activePlayersCount,
    setActivePlayersCount,
    isModelLoaded,
  };
}
