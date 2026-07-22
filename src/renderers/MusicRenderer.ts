import {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	TFile,
} from "obsidian";

import type {
	MusicObject,
	MusicTrack,
	PlayerState,
} from "../types/music";
import type { MusicPlayerService } from "../player/MusicPlayerService";
import { formatTime } from "../utils/formatTime";

class MusicPlayerRenderChild extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private readonly unsubscribe: () => void,
	) {
		super(containerEl);
	}

	onunload(): void {
		this.unsubscribe();
	}
}

export class MusicRenderer {
	constructor(
		private readonly app: App,
		private readonly player: MusicPlayerService,
	) {}

	render(
		music: MusicObject,
		container: HTMLElement,
		ctx: MarkdownPostProcessorContext,
	): void {
		const track = this.resolveTrack(music, ctx.sourcePath);

		if (!track) {
			container.createDiv({
				cls: "music-player-error",
				text: `找不到音频文件：${music.src ?? "未填写 src"}`,
			});
			return;
		}

		const card = container.createDiv({
			cls: "music-player-card",
		});

		const cover = card.createDiv({
			cls: "music-player-cover",
		});

		if (track.coverUrl) {
			cover.createEl("img", {
				attr: {
					src: track.coverUrl,
					alt: `${track.title} 封面`,
				},
			});
		} else {
			cover.createDiv({
				cls: "music-player-cover-placeholder",
				text: "♫",
			});
		}

		const content = card.createDiv({
			cls: "music-player-content",
		});

		const metadata = content.createDiv({
			cls: "music-player-metadata",
		});

		metadata.createDiv({
			cls: "music-player-title",
			text: track.title,
		});

		metadata.createDiv({
			cls: "music-player-artist",
			text: track.artist,
		});

		const controls = content.createDiv({
			cls: "music-player-controls",
		});

		const playButton = controls.createEl("button", {
			cls: "music-player-play-button",
			attr: {
				type: "button",
				"aria-label": "播放",
			},
		});

		const currentTime = controls.createSpan({
			cls: "music-player-time music-player-current-time",
			text: "0:00",
		});

		const progress = controls.createEl("input", {
			cls: "music-player-progress",
			type: "range",
		});

		progress.min = "0";
		progress.max = "0";
		progress.value = "0";
		progress.step = "0.1";

		const duration = controls.createSpan({
			cls: "music-player-time music-player-duration",
			text: "0:00",
		});

		const update = (state: PlayerState): void => {
			const isCurrentTrack =
				state.track?.id === track.id;

			const isPlaying =
				isCurrentTrack && state.isPlaying;

			card.toggleClass("is-playing", isPlaying);

			playButton.textContent = isPlaying
				? "❚❚"
				: "▶";

			playButton.setAttribute(
				"aria-label",
				isPlaying ? "暂停" : "播放",
			);

			if (!isCurrentTrack) {
				currentTime.textContent = "0:00";
				duration.textContent = "0:00";
				progress.max = "0";
				progress.value = "0";
				return;
			}

			currentTime.textContent = formatTime(
				state.currentTime,
			);

			duration.textContent = formatTime(
				state.duration,
			);

			progress.max = String(
				Number.isFinite(state.duration)
					? state.duration
					: 0,
			);

			progress.value = String(
				Number.isFinite(state.currentTime)
					? state.currentTime
					: 0,
			);
		};

		playButton.addEventListener("click", () => {
			this.player.toggle(track);
		});

		progress.addEventListener("input", () => {
			const state = this.player.getState();

			if (state.track?.id !== track.id) {
				return;
			}

			this.player.seek(Number(progress.value));
		});

		const unsubscribe = this.player.subscribe(update);

		/*
		 * 使用 Obsidian 的 MarkdownRenderChild 生命周期清理订阅。
		 * 不要使用 MutationObserver，否则卡片暂时离开 DOM 时，
		 * 订阅可能被过早取消，造成按钮和进度卡死。
		 */
		ctx.addChild(
			new MusicPlayerRenderChild(
				card,
				unsubscribe,
			),
		);
	}

	private resolveTrack(
		music: MusicObject,
		sourcePath: string,
	): MusicTrack | null {
		if (!music.src) {
			return null;
		}

		const audioFile = this.resolveVaultFile(
			music.src,
			sourcePath,
		);

		if (!audioFile) {
			return null;
		}

		const coverFile = music.cover
			? this.resolveVaultFile(
					music.cover,
					sourcePath,
				)
			: null;

		return {
			id: audioFile.path,
			title: music.title ?? "未知曲目",
			artist: music.artist ?? "未知艺术家",
			audioUrl:
				this.app.vault.getResourcePath(audioFile),
			coverUrl: coverFile
				? this.app.vault.getResourcePath(
						coverFile,
					)
				: undefined,
		};
	}

	private resolveVaultFile(
		path: string,
		sourcePath: string,
	): TFile | null {
		const direct =
			this.app.vault.getAbstractFileByPath(path);

		if (direct instanceof TFile) {
			return direct;
		}

		const linked =
			this.app.metadataCache.getFirstLinkpathDest(
				path,
				sourcePath,
			);

		return linked instanceof TFile ? linked : null;
	}
}