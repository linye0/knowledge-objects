import type {
	MusicTrack,
	PlayerState,
} from "../types/music";

type PlayerListener = (state: PlayerState) => void;

export class MusicPlayerService {
	private readonly audio = new Audio();
	private readonly listeners = new Set<PlayerListener>();

	private track: MusicTrack | null = null;

	constructor() {
		this.audio.preload = "metadata";

		this.audio.addEventListener("play", this.emit);
		this.audio.addEventListener("pause", this.emit);
		this.audio.addEventListener("timeupdate", this.emit);
		this.audio.addEventListener("loadedmetadata", this.emit);
		this.audio.addEventListener("ended", this.handleEnded);
	}

	getState(): PlayerState {
		return {
			track: this.track,
			isPlaying: !this.audio.paused,
			currentTime: this.audio.currentTime || 0,
			duration: Number.isFinite(this.audio.duration)
				? this.audio.duration
				: 0,
		};
	}

	subscribe(listener: PlayerListener): () => void {
		this.listeners.add(listener);
		listener(this.getState());

		return () => {
			this.listeners.delete(listener);
		};
	}

	async play(track: MusicTrack): Promise<void> {
		if (this.track?.id !== track.id) {
			this.track = track;
			this.audio.src = track.audioUrl;
			this.audio.currentTime = 0;
		}

		await this.audio.play();
		this.emit();
	}

	toggle(track?: MusicTrack): void {
		if (track && this.track?.id !== track.id) {
			void this.play(track).catch((error) => {
				console.error("音频播放失败", error);
			});
			return;
		}

		if (this.audio.paused) {
			void this.audio.play().catch((error) => {
				console.error("音频播放失败", error);
			});
		} else {
			this.audio.pause();
		}
	}

	seek(seconds: number): void {
		if (!Number.isFinite(seconds)) {
			return;
		}

		this.audio.currentTime = Math.max(
			0,
			Math.min(seconds, this.audio.duration || 0),
		);

		this.emit();
	}

	stop(): void {
		this.audio.pause();
		this.audio.currentTime = 0;
		this.emit();
	}

	destroy(): void {
		this.audio.pause();
		this.audio.removeAttribute("src");
		this.audio.load();

		this.audio.removeEventListener("play", this.emit);
		this.audio.removeEventListener("pause", this.emit);
		this.audio.removeEventListener("timeupdate", this.emit);
		this.audio.removeEventListener(
			"loadedmetadata",
			this.emit,
		);
		this.audio.removeEventListener(
			"ended",
			this.handleEnded,
		);

		this.listeners.clear();
	}

	private readonly handleEnded = (): void => {
		this.audio.currentTime = 0;
		this.emit();
	};

	private readonly emit = (): void => {
		const state = this.getState();

		for (const listener of this.listeners) {
			listener(state);
		}
	};
}