export interface HighlightClip {
  id: string;
  shotId: string;
  videoUri: string;
  timestamp: number;
}

class HighlightService {
  private isRecordingBuffer = false;
  private tempVideoUri: string | null = null;

  /**
   * Triggers when a player initiates a shot attempt.
   * Starts buffering the video clip locally.
   */
  public async startAttemptBuffer(shotId: string): Promise<void> {
    if (this.isRecordingBuffer) return;

    this.isRecordingBuffer = true;
    // Mocking the video frame buffer attachment from native camera
    this.tempVideoUri = `file://tmp/clips/attempt_${shotId}.mp4`;
    console.log(`[HighlightService] Started recording buffer for shot: ${shotId}`);
  }

  /**
   * Finalizes the dynamic recording based on success criteria.
   * Saves only if the shot was made, discards if missed.
   */
  public async finalizeTrackedShot(
    shotId: string,
    isMade: boolean
  ): Promise<HighlightClip | null> {
    if (!this.isRecordingBuffer) return null;

    this.isRecordingBuffer = false;

    if (isMade) {
      // SUCCESS: Keep the clip, promote from temp to permanent highlight storage
      const permanentUri = `file://documents/highlights/clip_${shotId}.mp4`;
      console.log(`[HighlightService] Shot MADE! Saving permanent clip: ${permanentUri}`);

      const clip: HighlightClip = {
        id: `clip_${Math.random().toString(36).substr(2, 9)}`,
        shotId: shotId,
        videoUri: this.tempVideoUri || permanentUri,
        timestamp: Date.now(),
      };

      this.tempVideoUri = null;
      return clip;
    } else {
      // MISSED: Discard the temp video to save phone storage
      console.log(`[HighlightService] Shot MISSED. Discarding temporary buffer for: ${shotId}`);
      await this.discardTempBuffer();
      return null;
    }
  }

  private async discardTempBuffer(): Promise<void> {
    if (this.tempVideoUri) {
      // In a real device environment, this uses Expo FileSystem to clear the cache file:
      // await FileSystem.deleteAsync(this.tempVideoUri, { idempotent: true });
      this.tempVideoUri = null;
    }
  }
}

export const highlightService = new HighlightService();
