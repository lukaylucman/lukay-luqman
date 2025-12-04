export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  borderColor: string;
}

export const SKINS: Skin[] = [
  { id: 'lucky', name: 'Lucky', color: '#eab308', borderColor: '#854d0e' }, // Yellow (Was Radit)
  { id: 'daffa', name: 'Daffa', color: '#ef4444', borderColor: '#991b1b' }, // Red
  { id: 'deden', name: 'Deden', color: '#22c55e', borderColor: '#15803d' }, // Green
  { id: 'radit', name: 'Radit', color: '#3b82f6', borderColor: '#1e40af' }, // Blue (Was Lucky)
];