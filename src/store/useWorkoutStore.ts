import { create } from 'zustand';
import { Session, Shot, SessionStatus } from '@/types/database.types';

interface WorkoutState {
  currentSession: Session | null;
  shots: Shot[];
  isRecording: boolean;
  startSession: (session: Session) => void;
  updateSessionStatus: (status: SessionStatus) => void;
  endSession: (endTime: string) => void;
  addShot: (shot: Shot) => void;
  clearWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  currentSession: null,
  shots: [],
  isRecording: false,
  startSession: (session) => set({ currentSession: session, isRecording: true, shots: [] }),
  updateSessionStatus: (status) => set((state) => ({ currentSession: state.currentSession ? { ...state.currentSession, status } : null })),
  endSession: (endTime) => set((state) => ({ isRecording: false, currentSession: state.currentSession ? { ...state.currentSession, end_time: endTime } : null })),
  addShot: (shot) => set((state) => ({ shots: [...state.shots, shot] })),
  clearWorkout: () => set({ currentSession: null, shots: [], isRecording: false }),
}));
