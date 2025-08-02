/**
 * Constants and default configuration values for the EYE web component
 */

export const DEFAULT_VALUES = {
  // Canvas and display settings
  EYE_SIZE: 900,
  VIDEO_POLLING_INTERVAL: 250,

  // Image adjustment defaults
  CONTRAST: 100,
  SATURATION: 100,
  BRIGHTNESS: 100,
  HUE: 0,

  // Default risograph colors
  COLOR_1: "black",
  COLOR_2: "orange",
  COLOR_3: "blue",
  COLOR_4: "pink",
  COLOR_5: "red",

  // Dithering
  DITHER_METHOD: "floyd-steinberg",

  // Video constraints
  VIDEO_WIDTH: 1920,
  VIDEO_HEIGHT: 1080,
  JPEG_QUALITY: 0.8,
};

export const DITHER_METHODS = [
  { value: "floyd-steinberg", label: "Floyd-Steinberg" },
  { value: "atkinson", label: "Atkinson" },
  { value: "burkes", label: "Burkes" },
  { value: "sierra", label: "Sierra" },
  { value: "stucki", label: "Stucki" },
  { value: "jarvis", label: "Jarvis-Judice-Ninke" },
  { value: "threshold", label: "Simple Threshold" },
];

export const SLIDER_CONFIGS = {
  contrast: { min: 0, max: 300, default: 100 },
  saturation: { min: 0, max: 300, default: 100 },
  brightness: { min: 0, max: 300, default: 100 },
  hue: { min: 0, max: 360, default: 0 },
};

export const OBSERVED_ATTRIBUTES = [
  "contrast",
  "saturation",
  "brightness",
  "hue",
  "color-1",
  "color-2",
  "color-3",
  "color-4",
  "color-5",
  "dither-method",
];

export const EVENTS = {
  NEW_PICTURE: "NEW PICTURE",
  IMAGE_DRAWN: "IMAGE DRAWN",
};

export const CSS_CLASSES = {
  bottomContainer: "bottom-controls",
  controlWrapper: "control-wrapper",
  exportButton: "export-layers-button",
  colorPickerContainer: "color-picker-container",
  colorRow: "color-row",
  colorInput: "color-input",
};
