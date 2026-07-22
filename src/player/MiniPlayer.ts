import type { PlayerState } from "../types/music";
import type { MusicPlayerService } from "./MusicPlayerService";
import { formatTime } from "../utils/formatTime";

export class MiniPlayer {
	private readonly root: HTMLElement;
	private readonly cover: HTMLImageElement;
	private readonly title: HTMLElement;
	private readonly artist: HTMLElement;
	private readonly playButton: HTMLButtonElement;
	private readonly progress: HTMLInputElement;
	private readonly currentTime: HTMLElement;
	private readonly duration: HTMLElement;
	private readonly closeButton: HTMLButtonElement;

	private unsubscribe: (() => void) | null = null;

	private isOpen = false;
	private hasTrack = false;

	constructor(
		parent: HTMLElement,
		private readonly player: MusicPlayerService,
	) {
		this.root = parent.createDiv({
			cls: "knowledge-objects-mini-player",
		});

		this.cover = this.root.createEl("img", {
			cls: "knowledge-objects-mini-cover",
			attr: {
				alt: "",
			},
		});

		const metadata = this.root.createDiv({
			cls: "knowledge-objects-mini-metadata",
		});

		this.title = metadata.createDiv({
			cls: "knowledge-objects-mini-title",
		});

		this.artist = metadata.createDiv({
			cls: "knowledge-objects-mini-artist",
		});

		this.playButton = this.root.createEl("button", {
			cls: "knowledge-objects-mini-play",
			attr: {
				type: "button",
				"aria-label": "播放或暂停",
			},
		});

		this.currentTime = this.root.createSpan({
			cls: "knowledge-objects-mini-time",
		});

		this.progress = this.root.createEl("input", {
			cls: "knowledge-objects-mini-progress",
			type: "range",
		});

		this.progress.min = "0";
		this.progress.step = "0.1";

		this.duration = this.root.createSpan({
			cls: "knowledge-objects-mini-time",
		});

		this.closeButton = this.root.createEl("button", {
			cls: "knowledge-objects-mini-close",
			attr: {
				type: "button",
				"aria-label": "关闭播放器",
			},
		});

		this.closeButton.textContent = "×";

		this.closeButton.addEventListener("click", () => {
			this.hide();
		});

		this.playButton.addEventListener("click", () => {
			this.player.toggle();
		});

		this.progress.addEventListener("input", () => {
			this.player.seek(Number(this.progress.value));
		});

		this.unsubscribe = this.player.subscribe((state) => {
			this.render(state);
		});
	}

	show(): void {
		if (!this.hasTrack) {
			return;
		}

		this.isOpen = true;
		this.updateVisibility();
	}

	hide(): void {
		this.isOpen = false;
		this.updateVisibility();
	}

	toggle(): void {
		if (!this.hasTrack) {
			return;
		}

		this.isOpen = !this.isOpen;
		this.updateVisibility();
	}

	private updateVisibility(): void {
		this.root.toggleClass(
			"is-visible",
			this.hasTrack && this.isOpen,
		);
	}

	destroy(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.root.remove();
	}

	private render(state: PlayerState): void {
		const { track } = state;

		this.hasTrack = track !== null;

		if (!track) {
			this.isOpen = false;
			this.updateVisibility();
			return;
		}

		this.updateVisibility();

		this.title.textContent = track.title;
		this.artist.textContent = track.artist;

		this.playButton.textContent = state.isPlaying
			? "❚❚"
			: "▶";

		this.currentTime.textContent = formatTime(
			state.currentTime,
		);

		this.duration.textContent = formatTime(
			state.duration,
		);

		this.progress.max = String(state.duration || 0);
		this.progress.value = String(state.currentTime);

		if (track.coverUrl) {
			this.cover.src = track.coverUrl;
			this.cover.removeClass("is-hidden");
		} else {
			this.cover.removeAttribute("src");
			this.cover.addClass("is-hidden");
		}
	}
}