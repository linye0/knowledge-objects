export interface MusicObject {
	title?: string;
	artist?: string;
	src?: string;
	cover?: string;
}

export interface MusicTrack {
	id: string;
	title: string;
	artist: string;
	audioUrl: string;
	coverUrl?: string;
}

export interface PlayerState {
	track: MusicTrack | null;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
}