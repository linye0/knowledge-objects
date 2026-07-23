import {
	MarkdownPostProcessorContext,
	Plugin,
} from "obsidian";
import { parse } from "yaml";

import type { MusicObject } from "./types/music";
import { MusicPlayerService } from "./player/MusicPlayerService";
import { MiniPlayer } from "./player/MiniPlayer";
import { MusicRenderer } from "./renderers/MusicRenderer";

export default class KnowledgeObjectsPlugin extends Plugin {
	private player!: MusicPlayerService;
	private miniPlayer!: MiniPlayer;
	private musicRenderer!: MusicRenderer;

	async onload(): Promise<void> {
		this.player = new MusicPlayerService();

		this.miniPlayer = new MiniPlayer(
			this.app.workspace.containerEl,
			this.player,
		);

		this.addRibbonIcon(
			"music",
			"显示或隐藏迷你播放器",
			() => {
				this.miniPlayer.toggle();
			},
		);

		this.musicRenderer = new MusicRenderer(
			this.app,
			this.player,
		);

		this.registerMarkdownCodeBlockProcessor(
			"music",
			(
				source: string,
				el: HTMLElement,
				ctx: MarkdownPostProcessorContext,
			) => {
				try {
					const music = parse(source) as MusicObject;

					this.musicRenderer.render(
						music,
						el,
						ctx,
					);
				} catch (error) {
					el.createDiv({
						cls: "music-player-error",
						text:
							error instanceof Error
								? error.message
								: "无法解析 music 对象",
					});
				}
			},
		);
	}

	onunload(): void {
		this.miniPlayer.destroy();
		this.player.destroy();
	}
}
