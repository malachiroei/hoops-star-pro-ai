import { Shot } from '@/types/database.types';

export interface HighlightMarker {
  id: string;
  trigger_event: 'Swish' | 'Long Range' | 'Fast Sequence' | 'Difficult Shot';
  start_time_seconds: number;
  end_time_seconds: number;
  shot_id: string;
}

export const highlightService = {
  /**
   * Scans a list of session shots and extracts key moments to generate highlights
   */
  detectHighlights(shots: Shot[]): HighlightMarker[] {
    const highlights: HighlightMarker[] = [];

    shots.forEach((shot, index) => {
      // Rule 1: Long Range Highlight (Any successful 3PT shot)
      if (shot.shot_type === '3PT' && shot.is_made) {
        highlights.push({
          id: Math.random().toString(36).substring(7),
          trigger_event: 'Long Range',
          // Capture 4 seconds before release and 2 seconds after
          start_time_seconds: Math.max(0, shot.timestamp_in_video - 4),
          end_time_seconds: shot.timestamp_in_video + 2,
          shot_id: shot.id,
        });
      }

      // Rule 2: Perfect Shot / Swish Simulation
      // (For now, mocked based on high arc and perfect entry, represented by arc_height > 4.5 meters)
      if (shot.is_made && shot.arc_height && shot.arc_height > 4.5) {
        highlights.push({
          id: Math.random().toString(36).substring(7),
          trigger_event: 'Swish',
          start_time_seconds: Math.max(0, shot.timestamp_in_video - 3),
          end_time_seconds: shot.timestamp_in_video + 2,
          shot_id: shot.id,
        });
      }

      // Rule 3: Fast Sequence (Streak)
      // Check if this shot and the previous shot were both made within 15 seconds
      if (index > 0 && shot.is_made && shots[index - 1].is_made) {
        const timeDifference = shot.timestamp_in_video - shots[index - 1].timestamp_in_video;
        if (timeDifference > 0 && timeDifference <= 15) {
          highlights.push({
            id: Math.random().toString(36).substring(7),
            trigger_event: 'Fast Sequence',
            start_time_seconds: Math.max(0, shots[index - 1].timestamp_in_video - 3),
            end_time_seconds: shot.timestamp_in_video + 2,
            shot_id: shot.id,
          });
        }
      }
    });

    return highlights;
  },
};
