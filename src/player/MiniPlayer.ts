import { setIcon } from "obsidian";

import type { PlayerState } from "../types/music";
import { formatTime } from "../utils/formatTime";
import type { MusicPlayerService } from "./MusicPlayerService";

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
			attr: { alt: "" },
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
				"aria-label": "播放",
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
				"aria-label": "关闭迷你播放器",
			},
		});
		setIcon(this.closeButton, "x");

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

	get isConnected(): boolean {
		return this.root.isConnected;
	}

	show(): void {
		this.isOpen = true;
		this.updateVisibility();
	}

	hide(): void {
		this.isOpen = false;
		this.updateVisibility();
	}

	toggle(): void {
		this.isOpen = !this.isOpen;
		this.updateVisibility();
	}

	destroy(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.root.remove();
	}

	private updateVisibility(): void {
		this.root.toggleClass("is-visible", this.isOpen);
	}

	private render(state: PlayerState): void {
		const { track } = state;

		this.hasTrack = track !== null;
		this.playButton.disabled = !this.hasTrack;
		this.progress.disabled = !this.hasTrack;

		if (!track) {
			this.title.textContent = "暂无播放曲目";
			this.artist.textContent = "请从音乐卡片中选择一首歌曲";
			this.currentTime.textContent = formatTime(0);
			this.duration.textContent = formatTime(0);
			this.progress.max = "0";
			this.progress.value = "0";
			this.cover.removeAttribute("src");
			this.cover.addClass("is-hidden");
			this.playButton.setAttribute(
				"aria-label",
				"暂无可播放曲目",
			);
			setIcon(this.playButton, "play");
			this.updateVisibility();
			return;
		}

		this.title.textContent = track.title;
		this.artist.textContent = track.artist;
		this.playButton.setAttribute(
			"aria-label",
			state.isPlaying ? "暂停" : "播放",
		);
		setIcon(
			this.playButton,
			state.isPlaying ? "pause" : "play",
		);

		this.currentTime.textContent = formatTime(
			state.currentTime,
		);
		this.duration.textContent = formatTime(state.duration);
		this.progress.max = String(state.duration || 0);
		this.progress.value = String(state.currentTime);

		if (track.coverUrl) {
			this.cover.src = track.coverUrl;
			this.cover.removeClass("is-hidden");
		} else {
			this.cover.removeAttribute("src");
			this.cover.addClass("is-hidden");
		}

		this.updateVisibility();
	}
}
