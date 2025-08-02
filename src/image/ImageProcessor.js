/**
 * ImageProcessor - Handles all image processing operations including dithering
 * Converts full-color images to limited color palettes using various algorithms
 */

import { colorToRgb, colorDistance, findClosestColor, buildPalette } from '../utils/ColorUtils.js';

export class ImageProcessor {
  constructor() {
    this.ditherMethod = 'floyd-steinberg';
    this.palette = null;
  }

  /**
   * Set the dithering method
   * @param {string} method - Dithering algorithm name
   */
  setDitherMethod(method) {
    this.ditherMethod = method;
  }

  /**
   * Set the color palette for processing
   * @param {string} color1 - First ink color
   * @param {string} color2 - Second ink color
   * @param {string} color3 - Third ink color
   * @param {string} color4 - Fourth ink color
   * @param {string} color5 - Fifth ink color
   */
  setPalette(color1, color2, color3, color4, color5) {
    this.palette = buildPalette(color1, color2, color3, color4, color5);
    console.log('Palette updated:', {
      white: 'white',
      color1, color2, color3, color4, color5,
      rgbPalette: this.palette
    });
  }

  /**
   * Main dithering function that applies the selected algorithm
   * Converts full-color image data to a limited color palette using dithering
   *
   * @param {ImageData} imageData - Canvas ImageData object to process
   * @returns {ImageData} Processed ImageData with colors reduced to palette
   */
  applyDithering(imageData) {
    if (!this.palette) {
      throw new Error('Palette not set. Call setPalette() first.');
    }

    console.log('Dithering with method:', this.ditherMethod);

    // Route to appropriate dithering algorithm
    if (this.ditherMethod === 'threshold') {
      return this.applyThresholdDithering(imageData, this.palette);
    } else {
      return this.applyErrorDiffusionDithering(imageData, this.palette, this.ditherMethod);
    }
  }

  /**
   * Simple threshold dithering (no error diffusion)
   *
   * This is the fastest dithering method that simply snaps each pixel to the
   * nearest color in the palette without any error distribution. Results in
   * hard edges and a more posterized/pixelated look suitable for retro aesthetics.
   *
   * @param {ImageData} imageData - Source image data to process
   * @param {number[][]} palette - Array of RGB color arrays to quantize to
   * @returns {ImageData} Processed image data with simple color quantization
   */
  applyThresholdDithering(imageData, palette) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Process each pixel independently
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldPixel = [data[idx], data[idx + 1], data[idx + 2]];
        const newPixel = findClosestColor(oldPixel, palette);

        // Replace pixel with closest palette color
        data[idx] = newPixel[0];     // R
        data[idx + 1] = newPixel[1]; // G
        data[idx + 2] = newPixel[2]; // B
        // Alpha channel remains unchanged
      }
    }

    return imageData;
  }

  /**
   * Advanced error diffusion dithering with multiple algorithm support
   *
   * Error diffusion algorithms work by calculating the difference between the original
   * pixel and the quantized pixel, then distributing this "error" to neighboring pixels
   * according to specific patterns. This creates smoother gradients and better preserves
   * image detail compared to simple threshold dithering.
   *
   * @param {ImageData} imageData - Source image data to process
   * @param {number[][]} palette - Array of RGB color arrays to quantize to
   * @param {string} method - Algorithm name (floyd-steinberg, atkinson, etc.)
   * @returns {ImageData} Processed image data with error diffusion dithering
   */
  applyErrorDiffusionDithering(imageData, palette, method) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Error diffusion matrices defining how quantization error is spread to neighbors
    const diffusionMatrices = this._getDiffusionMatrices();

    // Select diffusion matrix for the chosen algorithm (fallback to Floyd-Steinberg)
    const matrix = diffusionMatrices[method] || diffusionMatrices['floyd-steinberg'];

    // Process pixels from top-left to bottom-right for proper error propagation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldPixel = [data[idx], data[idx + 1], data[idx + 2]];
        const newPixel = findClosestColor(oldPixel, palette);

        // Replace pixel with nearest palette color
        data[idx] = newPixel[0];     // R
        data[idx + 1] = newPixel[1]; // G
        data[idx + 2] = newPixel[2]; // B
        // Alpha channel remains unchanged

        // Calculate quantization error for each color channel
        const errorR = oldPixel[0] - newPixel[0];
        const errorG = oldPixel[1] - newPixel[1];
        const errorB = oldPixel[2] - newPixel[2];

        // Distribute error to neighboring pixels according to algorithm's matrix
        matrix.forEach(({ x: dx, y: dy, factor }) => {
          const x2 = x + dx;
          const y2 = y + dy;

          // Only distribute to pixels within image bounds
          if (x2 >= 0 && x2 < width && y2 >= 0 && y2 < height) {
            const idx2 = (y2 * width + x2) * 4;
            // Add weighted error, clamping to valid RGB range [0, 255]
            data[idx2] = Math.max(0, Math.min(255, data[idx2] + errorR * factor));
            data[idx2 + 1] = Math.max(0, Math.min(255, data[idx2 + 1] + errorG * factor));
            data[idx2 + 2] = Math.max(0, Math.min(255, data[idx2 + 2] + errorB * factor));
          }
        });
      }
    }

    return imageData;
  }

  /**
   * Get error diffusion matrices for different dithering algorithms
   * @returns {Object} Object containing diffusion matrices for each algorithm
   * @private
   */
  _getDiffusionMatrices() {
    return {
      // Floyd-Steinberg (1976) - Classic algorithm, good balance of quality and speed
      'floyd-steinberg': [
        { x: 1, y: 0, factor: 7/16 },    // Right
        { x: -1, y: 1, factor: 3/16 },   // Bottom-left
        { x: 0, y: 1, factor: 5/16 },    // Bottom
        { x: 1, y: 1, factor: 1/16 }     // Bottom-right
      ],
      // Atkinson (1987) - Used in early Mac systems, produces high contrast results
      'atkinson': [
        { x: 1, y: 0, factor: 1/8 },    // Right
        { x: 2, y: 0, factor: 1/8 },    // Right + 1
        { x: -1, y: 1, factor: 1/8 },   // Bottom-left
        { x: 0, y: 1, factor: 1/8 },    // Bottom
        { x: 1, y: 1, factor: 1/8 },    // Bottom-right
        { x: 0, y: 2, factor: 1/8 }     // Bottom + 1
      ],
      // Burkes (1988) - Distributes error more widely, reduces artifacts
      'burkes': [
        { x: 1, y: 0, factor: 8/32 },   // Right
        { x: 2, y: 0, factor: 4/32 },   // Right + 1
        { x: -2, y: 1, factor: 2/32 },  // Bottom-left-left
        { x: -1, y: 1, factor: 4/32 },  // Bottom-left
        { x: 0, y: 1, factor: 8/32 },   // Bottom
        { x: 1, y: 1, factor: 4/32 },   // Bottom-right
        { x: 2, y: 1, factor: 2/32 }    // Bottom-right-right
      ],
      // Sierra (1990) - More complex pattern, good for detailed images
      'sierra': [
        { x: 1, y: 0, factor: 5/32 },   // Right
        { x: 2, y: 0, factor: 3/32 },   // Right + 1
        { x: -2, y: 1, factor: 2/32 },  // Bottom-left-left
        { x: -1, y: 1, factor: 4/32 },  // Bottom-left
        { x: 0, y: 1, factor: 5/32 },   // Bottom
        { x: 1, y: 1, factor: 4/32 },   // Bottom-right
        { x: 2, y: 1, factor: 2/32 },   // Bottom-right-right
        { x: -1, y: 2, factor: 2/32 },  // Bottom-bottom-left
        { x: 0, y: 2, factor: 3/32 },   // Bottom-bottom
        { x: 1, y: 2, factor: 2/32 }    // Bottom-bottom-right
      ],
      // Stucki (1981) - Higher quality with more error diffusion points
      'stucki': [
        { x: 1, y: 0, factor: 8/42 },   // Right
        { x: 2, y: 0, factor: 4/42 },   // Right + 1
        { x: -2, y: 1, factor: 2/42 },  // Bottom-left-left
        { x: -1, y: 1, factor: 4/42 },  // Bottom-left
        { x: 0, y: 1, factor: 8/42 },   // Bottom
        { x: 1, y: 1, factor: 4/42 },   // Bottom-right
        { x: 2, y: 1, factor: 2/42 },   // Bottom-right-right
        { x: -2, y: 2, factor: 1/42 },  // Bottom-bottom-left-left
        { x: -1, y: 2, factor: 2/42 },  // Bottom-bottom-left
        { x: 0, y: 2, factor: 4/42 },   // Bottom-bottom
        { x: 1, y: 2, factor: 2/42 },   // Bottom-bottom-right
        { x: 2, y: 2, factor: 1/42 }    // Bottom-bottom-right-right
      ],
      // Jarvis-Judice-Ninke (1976) - Most complex, highest quality but slower
      'jarvis': [
        { x: 1, y: 0, factor: 7/48 },   // Right
        { x: 2, y: 0, factor: 5/48 },   // Right + 1
        { x: -2, y: 1, factor: 3/48 },  // Bottom-left-left
        { x: -1, y: 1, factor: 5/48 },  // Bottom-left
        { x: 0, y: 1, factor: 7/48 },   // Bottom
        { x: 1, y: 1, factor: 5/48 },   // Bottom-right
        { x: 2, y: 1, factor: 3/48 },   // Bottom-right-right
        { x: -2, y: 2, factor: 1/48 },  // Bottom-bottom-left-left
        { x: -1, y: 2, factor: 3/48 },  // Bottom-bottom-left
        { x: 0, y: 2, factor: 5/48 },   // Bottom-bottom
        { x: 1, y: 2, factor: 3/48 },   // Bottom-bottom-right
        { x: 2, y: 2, factor: 1/48 }    // Bottom-bottom-right-right
      ]
    };
  }
}
