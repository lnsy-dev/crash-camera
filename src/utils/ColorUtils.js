/**
 * Color utility functions for the EYE web component
 * Handles color conversion, distance calculations, and palette operations
 */

/**
 * Converts any CSS color (name, hex, rgb, etc.) to RGB array
 * Uses canvas rendering to handle all CSS color formats consistently
 *
 * @param {string} color - CSS color value (e.g., 'red', '#FF0000', 'rgb(255,0,0)')
 * @returns {number[]} RGB array [r, g, b] where each value is 0-255
 */
export function colorToRgb(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/**
 * Calculates the Euclidean distance between two RGB colors
 * Used to determine which palette color is closest to a given pixel
 *
 * @param {number[]} rgb1 - First color as [r, g, b] array
 * @param {number[]} rgb2 - Second color as [r, g, b] array
 * @returns {number} Distance value (lower = more similar colors)
 */
export function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

/**
 * Finds the closest color in the palette to a given RGB color
 * Uses Euclidean distance in RGB color space for color matching
 *
 * @param {number[]} rgb - Target color as [r, g, b] array
 * @param {number[][]} palette - Array of palette colors [[r,g,b], [r,g,b], ...]
 * @returns {number[]} Closest palette color as [r, g, b] array
 */
export function findClosestColor(rgb, palette) {
  let closestColor = palette[0];
  let minDistance = colorDistance(rgb, palette[0]);

  for (let i = 1; i < palette.length; i++) {
    const distance = colorDistance(rgb, palette[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = palette[i];
    }
  }
  return closestColor;
}

/**
 * Helper function to convert color names to hex values
 * @param {string} colorName - Color name or hex value
 * @returns {string} Hex color value
 */
export function colorNameToHex(colorName) {
  // If it's already a hex color, return it
  if (colorName.startsWith('#')) {
    return colorName;
  }

  // Convert named colors to hex using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorName;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  // Convert RGB to hex
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Builds the standard 6-color palette for risograph printing
 * @param {string} color1 - First ink color
 * @param {string} color2 - Second ink color
 * @param {string} color3 - Third ink color
 * @param {string} color4 - Fourth ink color
 * @param {string} color5 - Fifth ink color
 * @returns {number[][]} Array of RGB color arrays
 */
export function buildPalette(color1, color2, color3, color4, color5) {
  return [
    [255, 255, 255], // White - represents paper/no ink
    colorToRgb(color1),
    colorToRgb(color2),
    colorToRgb(color3),
    colorToRgb(color4),
    colorToRgb(color5)
  ];
}
