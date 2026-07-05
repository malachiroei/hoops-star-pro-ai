import { supabase } from '@/lib/supabase';
import { Session, Shot, Profile } from '@/types/database.types';

export const syncService = {
  /**
   * Pushes a completed local session and its shots to the Supabase database
   */
  async syncSessionToCloud(
    session: Session,
    shots: Shot[],
    profile: Profile | null
  ): Promise<{ success: boolean; error: any }> {
    try {
      // 1. Prepare and insert/update the session row
      const finalizedSession = {
        ...session,
        creator_id: profile ? profile.id : null,
        status: 'uploaded' as const,
        end_time: new Date().toISOString(),
        is_synced: true,
      };

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert([finalizedSession]);

      if (sessionError) throw sessionError;

      // 2. If there are shots recorded, batch insert them
      if (shots.length > 0) {
        const finalizedShots = shots.map(shot => ({
          ...shot,
          session_id: session.id,
          // Enforce our identity rules: use authenticated profile id or anonymous tag
          player_id: profile ? profile.id : null,
          anonymous_player_tag: profile ? null : (shot.anonymous_player_tag || 'Player 1'),
        }));

        const { error: shotsError } = await supabase
          .from('shots')
          .insert(finalizedShots);

        if (shotsError) throw shotsError;
      }

      console.log(`[Sync Service] Session ${session.id} successfully synchronized to Supabase.`);
      return { success: true, error: null };
    } catch (error) {
      console.error('[Sync Service] Failed to sync session:', error);
      return { success: false, error };
    }
  },
};
