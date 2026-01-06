// Matching the Python Pydantic models from the requirement

export interface Character {
  name: string;
  core_traits: string;
  appearance_prompt: string;
  voice_id: string;
  
  // Frontend specific state for Character Design phase
  imageUrl?: string;
  isGenerating?: boolean;
}

export type AssetType = 'BGM' | 'SFX' | 'OVERLAY';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string; // Mock URL or CDN link
  duration?: number;
  tags: string[];
}

export type CameraMove = "Static" | "Pan Left" | "Pan Right" | "Zoom In" | "Zoom Out" | "Tracking" | "Shake";
export type ShotSize = "Extreme Close-up" | "Close-up" | "Medium Shot" | "Cowboy Shot" | "Wide Shot";
export type CameraAngle = "Eye Level" | "Low Angle" | "High Angle" | "Dutch Angle" | "Overhead" | "Worm's Eye";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "3:4" | "4:3";

export interface Shot {
  id: number;
  scene_description: string;
  visual_prompt: string;
  
  // Cinematography
  camera_movement: CameraMove; 
  camera_angle: CameraAngle;    
  shot_size: ShotSize;       
  camera_reasoning: string; 

  // NEW: Explicit Emotion Control
  character_emotion: string; 

  dialogue: string;
  character_focus: string;
  duration: number;        
  sound_effect?: string;   
  
  // Asset Mapping
  audio_asset_id?: string; 
  
  // Frontend specific state
  imageUrl?: string;       
  isGeneratingImage?: boolean; 
  
  // Video Generation State (Veo)
  videoUrl?: string;
  isGeneratingVideo?: boolean;

  // TTS State
  audioUrl?: string; // Blob URL for generated speech
  isGeneratingAudio?: boolean;
}

export interface ProjectSettings {
  bgm_asset_id?: string;
  global_style?: string;
  aspectRatio?: AspectRatio;
}

export interface ScriptResponse {
  title: string;
  // NEW: Anchor for environment consistency
  location_visuals: string; 
  projectSettings?: ProjectSettings;
  characters: Character[];
  shots: Shot[];
}

export enum ViewMode {
  WORKBENCH = 'WORKBENCH',
  FULLSCREEN = 'FULLSCREEN'
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}