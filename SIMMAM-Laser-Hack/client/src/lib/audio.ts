import { Howl, Howler } from 'howler';

// ─── Audio Manager ────────────────────────────────────────────────────────────
// Manages background music and sound effects using Howler.js.
// All files are optional — if they don't exist yet, audio simply won't play.

class AudioManager {
  private bgMusic: Howl | null = null;
  private sfx: Record<string, Howl> = {};
  private muted = false;

  constructor() {
    // Initialise with empty howls — swap URLs when you add audio files
    this.bgMusic = new Howl({
      src: ['/audio/bg_music.ogg', '/audio/bg_music.mp3'],
      loop: true,
      volume: 0.3,
      html5: true,
      onloaderror: () => {
        // Silence — background music is optional
        this.bgMusic = null;
      },
    });

    this.sfx = {
      wallHit: new Howl({
        src: ['/audio/sfx_wall_hit.ogg', '/audio/sfx_wall_hit.mp3'],
        volume: 0.6,
        onloaderror: () => {/* silence */},
      }),
      levelComplete: new Howl({
        src: ['/audio/sfx_level_complete.ogg', '/audio/sfx_level_complete.mp3'],
        volume: 0.7,
        onloaderror: () => {/* silence */},
      }),
      gameComplete: new Howl({
        src: ['/audio/sfx_game_complete.ogg', '/audio/sfx_game_complete.mp3'],
        volume: 0.8,
        onloaderror: () => {/* silence */},
      }),
      uiClick: new Howl({
        src: ['/audio/sfx_ui_click.ogg', '/audio/sfx_ui_click.mp3'],
        volume: 0.4,
        onloaderror: () => {/* silence */},
      }),
    };
  }

  startMusic() {
    if (this.bgMusic && !this.bgMusic.playing()) {
      this.bgMusic.play();
    }
  }

  stopMusic() {
    this.bgMusic?.stop();
  }

  play(name: keyof typeof this.sfx) {
    if (!this.muted) {
      this.sfx[name]?.play();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    return this.muted;
  }

  setMuted(val: boolean) {
    this.muted = val;
    Howler.mute(val);
  }

  isMuted() {
    return this.muted;
  }
}

export const audio = new AudioManager();
