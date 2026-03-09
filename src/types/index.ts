export type ProjectType = 'mood-board' | 'storyboard' | 'first-frames';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  createdAt: number;
  updatedAt: number;
  thumbnailBlobId: string | null;
  imageCount: number;
}

export interface BoardImage {
  id: string;
  projectId: string;
  blobId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  x: number;
  y: number;
  label: string;
  createdAt: number;
  displayWidth?: number;
  displayHeight?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

export interface ImageBlob {
  id: string;
  blob: Blob;
}

export interface Connection {
  id: string;
  projectId: string;
  fromId: string;
  toId: string;
  label: string;
}

export interface TextNode {
  id: string;
  projectId: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
}

// ─── Shot Category Notes (Image-to-Video Prompting) ─────────────────────────

export type ShotCategoryId =
  | 'camera'
  | 'subject'
  | 'action'
  | 'environment'
  | 'lighting'
  | 'texture'
  | 'audio'
  | 'mood'
  | 'color'
  | 'lens';

export interface ShotCategory {
  id: ShotCategoryId;
  label: string;
  color: string;         // accent hex
  bg: string;            // card background
  border: string;        // border color
  icon: string;          // emoji icon
  placeholder: string;   // textarea hint text
  prompts: string[];     // checklist hints shown inside the note
}

export const SHOT_CATEGORIES: ShotCategory[] = [
  {
    id: 'camera',
    label: 'Camera',
    color: '#60a5fa',
    bg: '#0c1829',
    border: '#1e3a5f',
    icon: '📷',
    placeholder: 'e.g. Handheld tracking shot, low angle, slight tilt...',
    prompts: ['Shot type?', 'Camera movement?', 'Angle?', 'Framing?'],
  },
  {
    id: 'subject',
    label: 'Subject',
    color: '#4ade80',
    bg: '#0b1e14',
    border: '#1a4a2a',
    icon: '👤',
    placeholder: 'e.g. Protagonist in mid-shot, looking left, tense...',
    prompts: ['Who / what is in frame?', 'Pose / position?', 'Expression?', 'Wardrobe details?'],
  },
  {
    id: 'action',
    label: 'Action',
    color: '#c084fc',
    bg: '#160d24',
    border: '#3b1f5e',
    icon: '⚡',
    placeholder: 'e.g. Character runs toward camera, stumbles, looks back...',
    prompts: ['What happens?', 'Speed / pacing?', 'Key beat?', 'Transition out?'],
  },
  {
    id: 'environment',
    label: 'Environment',
    color: '#fb923c',
    bg: '#1c1008',
    border: '#4a2c10',
    icon: '🌍',
    placeholder: 'e.g. Abandoned warehouse, dusk, fog rolling in...',
    prompts: ['Location / setting?', 'Time of day?', 'Weather?', 'Era / period?'],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    color: '#22d3ee',
    bg: '#071a1e',
    border: '#0f3d47',
    icon: '💡',
    placeholder: 'e.g. Hard rim light from left, practical neon signs, deep shadows...',
    prompts: ['Key light direction?', 'Quality (hard/soft)?', 'Color temp?', 'Practicals in scene?'],
  },
  {
    id: 'texture',
    label: 'Texture',
    color: '#2dd4bf',
    bg: '#071c1a',
    border: '#0f3d39',
    icon: '🖼️',
    placeholder: 'e.g. Film grain, analog noise, shallow DOF with lens flares...',
    prompts: ['Film look / grain?', 'Lens character?', 'Color grade style?', 'VFX / comp notes?'],
  },
  {
    id: 'audio',
    label: 'Audio',
    color: '#86efac',
    bg: '#061510',
    border: '#143d24',
    icon: '🎵',
    placeholder: 'e.g. Diegetic: rain + distant sirens. Score: tense strings swell...',
    prompts: ['Diegetic sounds?', 'Score / music style?', 'Dialogue / VO?', 'Silence / ambient?'],
  },
  {
    id: 'mood',
    label: 'Mood',
    color: '#f472b6',
    bg: '#1c0a14',
    border: '#4a1a30',
    icon: '😌',
    placeholder: 'e.g. Paranoid, claustrophobic, the moment before the storm...',
    prompts: ['Emotional tone?', 'Tension level?', 'Genre feel?', 'Reference films?'],
  },
  {
    id: 'color',
    label: 'Color',
    color: '#facc15',
    bg: '#191200',
    border: '#453600',
    icon: '🎨',
    placeholder: 'e.g. Teal & orange contrast, desaturated midtones, crush blacks...',
    prompts: ['Palette / scheme?', 'Dominant hues?', 'Contrast level?', 'Grade reference?'],
  },
  {
    id: 'lens',
    label: 'Lens',
    color: '#a78bfa',
    bg: '#130d22',
    border: '#321d5e',
    icon: '🔭',
    placeholder: 'e.g. 35mm, f/1.4, front bokeh, slight vignette...',
    prompts: ['Focal length?', 'Aperture / DOF?', 'Distortion?', 'Filter / diffusion?'],
  },
];

// ─── Image Edit Prompting Notes ─────────────────────────────────────────────

export type EditCategoryId =
  | 'edit-subject-identity'
  | 'edit-pose'
  | 'edit-lighting-keep'
  | 'edit-color-grade'
  | 'edit-background-keep'
  | 'edit-style'
  | 'edit-camera-angle'
  | 'edit-focal-length'
  | 'edit-framing'
  | 'edit-background-replace'
  | 'edit-outfit-swap'
  | 'edit-lighting-change'
  | 'edit-time-weather';

export interface EditCategory {
  id: EditCategoryId;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  zone: 'keep' | 'cut';
  placeholder: string;
  prompts: string[];
}

export const EDIT_CATEGORIES: EditCategory[] = [
  // ── ZONE 1 — KEEP (What to Preserve) ──
  {
    id: 'edit-subject-identity',
    label: 'Subject Identity',
    color: '#4ade80',
    bg: '#0b1e14',
    border: '#1a4a2a',
    icon: '🔒',
    zone: 'keep',
    placeholder: 'e.g. Face, body proportions, hair, skin — locked...',
    prompts: ['Face features?', 'Body proportions?', 'Hair style/color?', 'Skin details?'],
  },
  {
    id: 'edit-pose',
    label: 'Pose / Body Position',
    color: '#60a5fa',
    bg: '#0c1829',
    border: '#1e3a5f',
    icon: '🧍',
    zone: 'keep',
    placeholder: 'e.g. Unless changing — state current pose...',
    prompts: ['Current pose?', 'Hand placement?', 'Body orientation?', 'Weight distribution?'],
  },
  {
    id: 'edit-lighting-keep',
    label: 'Lighting Direction',
    color: '#22d3ee',
    bg: '#071a1e',
    border: '#0f3d47',
    icon: '💡',
    zone: 'keep',
    placeholder: 'e.g. Keep same key light side + quality...',
    prompts: ['Key light side?', 'Light quality?', 'Shadow direction?', 'Highlight intensity?'],
  },
  {
    id: 'edit-color-grade',
    label: 'Color Grade / Mood',
    color: '#facc15',
    bg: '#191200',
    border: '#453600',
    icon: '🎨',
    zone: 'keep',
    placeholder: 'e.g. Match the original tone/palette...',
    prompts: ['Color temperature?', 'Saturation level?', 'Tone/palette?', 'Contrast style?'],
  },
  {
    id: 'edit-background-keep',
    label: 'Background Elements',
    color: '#fb923c',
    bg: '#1c1008',
    border: '#4a2c10',
    icon: '🏔️',
    zone: 'keep',
    placeholder: 'e.g. Which specific elements stay...',
    prompts: ['Key background items?', 'Depth layers?', 'Environment details?', 'Atmosphere?'],
  },
  {
    id: 'edit-style',
    label: 'Style / Film Stock',
    color: '#2dd4bf',
    bg: '#071c1a',
    border: '#0f3d39',
    icon: '🎞️',
    zone: 'keep',
    placeholder: 'e.g. Keep the same render/photographic style...',
    prompts: ['Render style?', 'Film stock type?', 'Grain/texture?', 'Processing look?'],
  },

  // ── ZONE 2 — CUT (What to Change) ──
  {
    id: 'edit-camera-angle',
    label: 'Camera Angle Delta',
    color: '#f87171',
    bg: '#1c0a0a',
    border: '#4a1a1a',
    icon: '📐',
    zone: 'cut',
    placeholder: 'e.g. From: front-facing → To: 3/4 left profile...',
    prompts: ['Current angle?', 'Target angle?', 'Rotation axis?', 'Perspective shift?'],
  },
  {
    id: 'edit-focal-length',
    label: 'Focal Length Shift',
    color: '#a78bfa',
    bg: '#130d22',
    border: '#321d5e',
    icon: '🔭',
    zone: 'cut',
    placeholder: 'e.g. Was 85mm → now 35mm, wider field...',
    prompts: ['Current focal length?', 'Target focal length?', 'DOF change?', 'Perspective effect?'],
  },
  {
    id: 'edit-framing',
    label: 'Distance / Framing',
    color: '#c084fc',
    bg: '#160d24',
    border: '#3b1f5e',
    icon: '🖼️',
    zone: 'cut',
    placeholder: 'e.g. Tight headshot → waist-up...',
    prompts: ['Current framing?', 'Target framing?', 'Subject scale?', 'Crop direction?'],
  },
  {
    id: 'edit-background-replace',
    label: 'Background Replace',
    color: '#fb923c',
    bg: '#1c1008',
    border: '#4a2c10',
    icon: '🔄',
    zone: 'cut',
    placeholder: 'e.g. What goes out, what comes in...',
    prompts: ['Elements to remove?', 'New background?', 'Depth matching?', 'Lighting consistency?'],
  },
  {
    id: 'edit-outfit-swap',
    label: 'Outfit / Object Swap',
    color: '#f472b6',
    bg: '#1c0a14',
    border: '#4a1a30',
    icon: '👔',
    zone: 'cut',
    placeholder: 'e.g. Exactly what changes on the subject...',
    prompts: ['Item to remove?', 'Replacement item?', 'Material/color?', 'Fit/style?'],
  },
  {
    id: 'edit-lighting-change',
    label: 'Lighting Style Change',
    color: '#22d3ee',
    bg: '#071a1e',
    border: '#0f3d47',
    icon: '💫',
    zone: 'cut',
    placeholder: 'e.g. Soft Rembrandt → hard split...',
    prompts: ['Current lighting?', 'Target lighting?', 'Shadow style?', 'Mood shift?'],
  },
  {
    id: 'edit-time-weather',
    label: 'Time of Day / Weather',
    color: '#86efac',
    bg: '#061510',
    border: '#143d24',
    icon: '⛅',
    zone: 'cut',
    placeholder: 'e.g. If environment is shifting...',
    prompts: ['Current time/weather?', 'Target time/weather?', 'Sky changes?', 'Ambient light shift?'],
  },
];

export interface CategoryNote {
  id: string;
  projectId: string;
  imageId: string;          // parent image node
  categoryId: ShotCategoryId;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  checkedPrompts: string[]; // which prompt hints are checked off
  isMinimized?: boolean;    // minimize/maximize state
}

export interface EditNote {
  id: string;
  projectId: string;
  imageId: string;
  categoryId: EditCategoryId;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  checkedPrompts: string[];
  isMinimized?: boolean;
}

// ─── Persistent Prompt Nodes ──────────────────────────────────────────────────

export interface PromptNode {
  id: string;
  projectId: string;
  imageId: string;          // parent image (for tether line)
  text: string;             // the generated prompt text
  model: string;            // model that generated it
  promptType: 'i2v' | 'edit';
  x: number;
  y: number;
  width: number;
  isMinimized: boolean;
  createdAt: number;
}
