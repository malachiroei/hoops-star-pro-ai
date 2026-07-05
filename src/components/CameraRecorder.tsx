import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useWorkoutStore } from '@/store/useWorkoutStore';

export default function CameraRecorder() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  const { isRecording, startSession, endSession } = useWorkoutStore();
  const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.container}><Text style={styles.text}>Loading permissions...</Text></View>;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Permissions required</Text>
        <TouchableOpacity style={styles.button} onPress={() => { requestCameraPermission(); requestMicrophonePermission(); }}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleToggleRecording() {
    if (isRecording) {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
        endSession(new Date().toISOString());
      }
    } else {
      if (cameraRef.current) {
        const mockSession = {
          id: Math.random().toString(36).substring(7),
          creator_id: null,
          start_time: new Date().toISOString(),
          end_time: null,
          court_type: 'Full Court' as const,
          status: 'recording' as const,
          video_url: null,
          thumbnail_url: null,
          is_synced: false,
          created_at: new Date().toISOString(),
        };
        startSession(mockSession);
        try {
          const video = await cameraRef.current.recordAsync({ maxDuration: 3600, quality: '1080p' });
          if (video && video.uri) {
            setLocalVideoUri(video.uri);
            console.log('Video saved to:', video.uri);
          }
        } catch (error) {
          console.error(error);
          endSession(new Date().toISOString());
        }
      }
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} mode="video" ref={cameraRef}>
        <View style={styles.overlayContainer}>
          <TouchableOpacity style={[styles.recordButton, isRecording ? styles.recordingActive : styles.recordingInactive]} onPress={handleToggleRecording}>
            <Text style={styles.recordButtonText}>{isRecording ? 'STOP' : 'REC'}</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlayContainer: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 40 },
  text: { textAlign: 'center', color: '#fff' },
  button: { backgroundColor: '#1E90FF', padding: 12, borderRadius: 8, alignSelf: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  recordButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  recordingInactive: { backgroundColor: '#FF0000' },
  recordingActive: { backgroundColor: '#333' },
  recordButtonText: { color: '#fff', fontWeight: 'bold' }
});
