export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
export type CourtType = 'Half Court' | 'Full Court';
export type ShotType = '3PT' | '2PT' | 'Free Throw' | 'Layup' | 'Jump Shot';
export type SessionStatus = 'recording' | 'uploading' | 'uploaded' | 'processing' | 'complete' | 'failed';

export interface Profile {
  id: string;
  updated_at: string;
  full_name: string | null;
  avatar_url: string | null;
  jersey_number: number | null;
  skill_level: SkillLevel | null;
  total_shots_attempted: number;
  total_shots_made: number;
  created_at: string;
}

export interface Session {
  id: string;
  creator_id: string | null;
  start_time: string;
  end_time: string | null;
  court_type: CourtType;
  status: SessionStatus;
  video_url: string | null;
  thumbnail_url: string | null;
  is_synced: boolean;
  created_at: string;
}

export interface Shot {
  id: string;
  session_id: string;
  player_id: string | null;
  anonymous_player_tag: string | null;
  shot_type: ShotType;
  is_made: boolean;
  x_coordinate: number | null;
  y_coordinate: number | null;
  arc_height: number | null;
  release_speed: number | null;
  release_point_y: number | null;
  timestamp_in_video: number;
  created_at: string;
}

export interface PlayerMetrics {
  id: string;
  session_id: string;
  player_id: string | null;
  anonymous_player_tag: string | null;
  max_jump_height: number | null;
  top_speed: number | null;
  avg_reaction_time: number | null;
  possession_time: number | null;
  created_at: string;
}
