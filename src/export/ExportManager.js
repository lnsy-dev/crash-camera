/**
 * ExportManager - Handles image capture and risograph layer export functionality
 * Manages JPEG capture and PNG layer separation for printing workflows
 */

import { colorToRgb, buildPalette } from "../utils/ColorUtils.js";
import { DEFAULT_VALUES, EVENTS } from "../utils/Constants.js";

export class ExportManager {
  constructor() {
    this.scratchCanvas = null;
    this.finalCanvas = null;
    this.eventTarget = null;
  }

  /**
   * Initialize the export manager with canvas references
   * @param {HTMLCanvasElement} scratchCanvas - Source canvas for captures
   * @param {HTMLCanvasElement} finalCanvas - Processed canvas for layer export
   * @param {EventTarget} eventTarget - Target for dispatching events
   */
  initialize(scratchCanvas, finalCanvas, eventTarget) {
    this.scratchCanvas = scratchCanvas;
    this.finalCanvas = finalCanvas;
    this.eventTarget = eventTarget;
  }

  /**
   * Capture current image as JPEG blob
   * @returns {Promise<Blob>} JPEG image blob
   */
  async getJpeg() {
    if (!this.scratchCanvas) {
      throw new Error("Export manager not initialized");
    }

    const imageData = await new Promise((resolve) => {
      this.scratchCanvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        DEFAULT_VALUES.JPEG_QUALITY,
      );
    });
    return imageData;
  }

  /**
   * Get current image as data URL
   * @returns {Promise<string>} PNG data URL
   */
  async getImageData() {
    if (!this.scratchCanvas) {
      throw new Error("Export manager not initialized");
    }

    const imageData = await this.scratchCanvas.toDataURL("image/png");
    return imageData;
  }

  /**
   * Take a picture and dispatch event
   * @returns {Promise<void>}
   */
  async takePicture() {
    const img = await this.getJpeg();

    if (this.eventTarget) {
      this.eventTarget.dispatchEvent(
        new CustomEvent(EVENTS.NEW_PICTURE, {
          detail: img,
        }),
      );
    }
  }

  /**
   * Export risograph layers as separate PNG files
   * @param {string} color1 - First color
   * @param {string} color2 - Second color
   * @param {string} color3 - Third color
   * @param {string} color4 - Fourth color
   * @param {string} color5 - Fifth color
   * @param {number} eyeWidth - Canvas width
   * @param {number} eyeHeight - Canvas height
   */
  async exportRisographLayers(
    color1,
    color2,
    color3,
    color4,
    color5,
    eyeWidth,
    eyeHeight,
  ) {
    if (!this.finalCanvas) {
      throw new Error("Export manager not initialized");
    }

    // Get the current dithered image data
    const ctx = this.finalCanvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, eyeWidth, eyeHeight);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Define the color palette (same as in dithering)
    const palette = buildPalette(color1, color2, color3, color4, color5);
    const colorNames = ["white", color1, color2, color3, color4, color5];

    // Create 5 layers (skip white/paper layer)
    for (let layerIndex = 1; layerIndex < palette.length; layerIndex++) {
      const layerCanvas = document.createElement("canvas");
      layerCanvas.width = width;
      layerCanvas.height = height;
      const layerCtx = layerCanvas.getContext("2d");
      const layerImageData = layerCtx.createImageData(width, height);
      const layerData = layerImageData.data;

      const targetColor = palette[layerIndex];

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Check if this pixel matches the target color for this layer
        if (
          r === targetColor[0] &&
          g === targetColor[1] &&
          b === targetColor[2]
        ) {
          // This pixel should have ink - make it black
          layerData[i] = 0; // R
          layerData[i + 1] = 0; // G
          layerData[i + 2] = 0; // B
          layerData[i + 3] = 255; // A (fully opaque)
        } else {
          // This pixel should not have ink - make it white/transparent
          layerData[i] = 255; // R
          layerData[i + 1] = 255; // G
          layerData[i + 2] = 255; // B
          layerData[i + 3] = 255; // A (fully opaque white)
        }
      }

      // Put the layer data on the canvas
      layerCtx.putImageData(layerImageData, 0, 0);

      // Export as PNG
      layerCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `risograph-layer-${layerIndex}-${colorNames[layerIndex]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");
    }

    console.log("Exported 5 risograph layers:", colorNames.slice(1));
  }

  /**
   * Draw a line on the final canvas overlay
   * Useful for adding visual guides or annotations to the camera feed
   *
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {number} lineWidth - Width of the line in pixels (default: 1)
   * @param {string} strokeStyle - Color of the line (default: 'red')
   */
  drawLine(startX, startY, endX, endY, lineWidth = 1, strokeStyle = "red") {
    if (!this.finalCanvas) {
      throw new Error("Export manager not initialized");
    }

    const ctx = this.finalCanvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.scratchCanvas = null;
    this.finalCanvas = null;
    this.eventTarget = null;
  }
}
