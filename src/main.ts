import {
	MarkdownPostProcessorContext,
	Plugin,
	TFile,
	setIcon,
} from "obsidian";
import { parse } from "yaml";

interface MusicObject {
	title?: string;
	artist?: string;
	src?: string;
	cover?: string;
}

export default class KnowledgeObjectsPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerMarkdownCodeBlockProcessor(
			"music",
			(
				source: string,
				el: HTMLElement,
				ctx: MarkdownPostProcessorContext,
			) => {
				try {
					const music = parse(source) as MusicObject;
					this.renderMusicPlayer(music, el, ctx);
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "无法解析 music 对象";

					el.createDiv({
						cls: "music-player-error",
						text: message,
					});
				}
			},
		);
	}

	private renderMusicPlayer(
		music: MusicObject,
		container: HTMLElement,
		ctx: MarkdownPostProcessorContext,
	): void {
		const audioFile = music.src
			? this.resolveVaultFile(music.src, ctx.sourcePath)
			: null;

		if (!audioFile) {
			container.createDiv({
				cls: "music-player-error",
				text: `找不到音频文件：${music.src ?? "未填写 src"}`,
			});
			return;
		}

		const audioUrl = this.app.vault.getResourcePath(audioFile);

		const card = container.createDiv({
			cls: "music-player-card",
		});

		const coverContainer = card.createDiv({
			cls: "music-player-cover",
		});

		const coverFile = music.cover
			? this.resolveVaultFile(music.cover, ctx.sourcePath)
			: null;

		if (coverFile) {
			const image = coverContainer.createEl("img");
			image.src = this.app.vault.getResourcePath(coverFile);
			image.alt = `${music.title ?? "未知曲目"} 封面`;
		} else {
			coverContainer.createDiv({
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
			text: music.title ?? "未知曲目",
		});

		metadata.createDiv({
			cls: "music-player-artist",
			text: music.artist ?? "未知艺术家",
		});

		const audio = content.createEl("audio");
		audio.src = audioUrl;
		audio.preload = "metadata";

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

		setIcon(playButton, "play");

		const currentTime = controls.createSpan({
			cls: "music-player-time music-player-current-time",
			text: "0:00",
		});

		const progress = controls.createEl("input", {
			cls: "music-player-progress",
			type: "range",
			attr: {
				"aria-label": "播放进度",
			},
		});

		progress.min = "0";
		progress.max = "100";
		progress.value = "0";
		progress.step = "0.1";

		const duration = controls.createSpan({
			cls: "music-player-time music-player-duration",
			text: "0:00",
		});

		playButton.addEventListener("click", () => {
			if (audio.paused) {
				audio.play().catch((error) => {
					console.error("音频播放失败", error);
				});
			} else {
				audio.pause();
			}
		});

		audio.addEventListener("play", () => {
			setIcon(playButton, "pause");

			playButton.setAttribute("aria-label", "暂停");
			card.addClass("is-playing");
		});

		audio.addEventListener("pause", () => {
			setIcon(playButton, "play");

			playButton.setAttribute("aria-label", "播放");
			card.removeClass("is-playing");
		});

		audio.addEventListener("loadedmetadata", () => {
			duration.textContent = this.formatTime(audio.duration);
		});

		audio.addEventListener("timeupdate", () => {
			currentTime.textContent = this.formatTime(audio.currentTime);

			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				progress.value = String(
					(audio.currentTime / audio.duration) * 100,
				);
			}
		});

		progress.addEventListener("input", () => {
			if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
				return;
			}

			audio.currentTime =
				(Number(progress.value) / 100) * audio.duration;
		});

		audio.addEventListener("ended", () => {
			progress.value = "0";
			currentTime.textContent = "0:00";
		});
	}

	private resolveVaultFile(
		path: string,
		sourcePath: string,
	): TFile | null {
		const directFile =
			this.app.vault.getAbstractFileByPath(path);

		if (directFile instanceof TFile) {
			return directFile;
		}

		const linkedFile =
			this.app.metadataCache.getFirstLinkpathDest(
				path,
				sourcePath,
			);

		return linkedFile instanceof TFile
			? linkedFile
			: null;
	}

	private formatTime(seconds: number): string {
		if (!Number.isFinite(seconds)) {
			return "0:00";
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);

		return `${minutes}:${remainingSeconds
			.toString()
			.padStart(2, "0")}`;
	}
}