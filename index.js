/**
 * EYE Web Component - Advanced Camera Interface for Risograph Printing
 *
 * A comprehensive web component that provides real-time camera capture with advanced
 * image processing features specifically designed for risograph printing workflows.
 *
 * Key Features:
 * - Real-time camera feed with multiple device support
 * - Advanced color reduction and dithering algorithms
 * - 5-color palette system optimized for risograph printing
 * - Multiple dithering algorithms (Floyd-Steinberg, Atkinson, etc.)
 * - Automatic layer separation for multi-color printing
 * - Real-time image adjustments (contrast, saturation, brightness, hue)
 * - Mobile-friendly camera switching (front/back cameras)
 * - Export system for print-ready PNG layers
 *
 * Usage:
 * <e-y-e
 *   contrast="100"
 *   saturation="100"
 *   brightness="100"
 *   hue="0"
 *   color-1="black"
 *   color-2="orange"
 *   color-3="blue"
 *   color-4="pink"
 *   color-5="red"
 *   dither-method="floyd-steinberg">
 * </e-y-e>
 *
 * Events:
 * - 'NEW PICTURE': Fired when a picture is taken
 * - 'IMAGE DRAWN': Fired every frame with processed image data
 *
 * @author Crash Camera Team
 * @version 2.0.0
 */

import { CameraManager } from "./src/camera/CameraManager.js";
import { ImageProcessor } from "./src/image/ImageProcessor.js";
import { UIManager } from "./src/ui/UIManager.js";
import { ExportManager } from "./src/export/ExportManager.js";
import {
  DEFAULT_VALUES,
  OBSERVED_ATTRIBUTES,
  EVENTS,
} from "./src/utils/Constants.js";
import { convertToPixels } from "./src/utils/SizeUtils.js";

class EYE extends HTMLElement {
  // =============================================================================
  // CLASS PROPERTIES
  // =============================================================================

  /** @type {boolean} Whether video polling is currently active */
  video_polling = false;

  /** @type {boolean} Whether the image should be horizontally flipped */
  flipped = false;

  /** @type {number} Canvas width in pixels */
  eye_width = DEFAULT_VALUES.EYE_SIZE;

  /** @type {number} Canvas height in pixels */
  eye_height = DEFAULT_VALUES.EYE_SIZE;

  /** @type {number} Width value in the selected unit */
  width_value = DEFAULT_VALUES.WIDTH_VALUE;

  /** @type {number} Height value in the selected unit */
  height_value = DEFAULT_VALUES.HEIGHT_VALUE;

  /** @type {string} Size unit (px, cm, in) */
  size_unit = DEFAULT_VALUES.SIZE_UNIT;

  /** @type {number} DPI for unit conversion */
  dpi = DEFAULT_VALUES.DPI;

  /** @type {number} Image contrast level (0-300, default 100) */
  contrast = DEFAULT_VALUES.CONTRAST;

  /** @type {number} Image saturation level (0-300, default 100) */
  saturation = DEFAULT_VALUES.SATURATION;

  /** @type {number} Image brightness level (0-300, default 100) */
  brightness = DEFAULT_VALUES.BRIGHTNESS;

  /** @type {number} Image hue rotation in degrees (0-360, default 0) */
  hue = DEFAULT_VALUES.HUE;

  /** @type {string} First risograph ink color */
  color1 = DEFAULT_VALUES.COLOR_1;

  /** @type {string} Second risograph ink color */
  color2 = DEFAULT_VALUES.COLOR_2;

  /** @type {string} Third risograph ink color */
  color3 = DEFAULT_VALUES.COLOR_3;

  /** @type {string} Fourth risograph ink color */
  color4 = DEFAULT_VALUES.COLOR_4;

  /** @type {string} Fifth risograph ink color */
  color5 = DEFAULT_VALUES.COLOR_5;

  /** @type {string} Current dithering algorithm method */
  dither_method = DEFAULT_VALUES.DITHER_METHOD;

  // Manager instances
  cameraManager = new CameraManager();
  imageProcessor = new ImageProcessor();
  uiManager = new UIManager();
  exportManager = new ExportManager();

  // Canvas elements
  scratch_canvas = null;
  scratch_canvas_context = null;
  final_canvas = null;
  final_canvas_context = null;

  // Polling
  video_poll = null;

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  /**
   * Renders the initial connection interface
   * Creates a "Connect" button that initializes the camera interface when clicked
   */
  render() {
    const initialize_button = document.createElement("button");
    initialize_button.classList.add("initialize-button");
    initialize_button.innerText = "Connect";
    initialize_button.addEventListener("click", () => {
      this.openEYE();
    });
    this.appendChild(initialize_button);
  }

  /**
   * Initialize the full camera interface
   */
  openEYE() {
    this.innerHTML = "";
    this.setupCanvases();
    this.setupManagers();
    this.createUI();
    this.startCamera();
  }

  /**
   * Setup canvas elements
   */
  setupCanvases() {
    // Scratch canvas for video capture
    this.scratch_canvas = document.createElement("canvas");
    this.scratch_canvas.width = this.eye_width;
    this.scratch_canvas.height = this.eye_height;
    this.scratch_canvas_context = this.scratch_canvas.getContext("2d", {
      preserveDrawingBuffer: true,
    });

    // Final canvas for processed output
    this.final_canvas = document.createElement("canvas");
    this.final_canvas.width = this.eye_width;
    this.final_canvas.height = this.eye_height;
    this.final_canvas_context = this.final_canvas.getContext("2d", {
      preserveDrawingBuffer: true,
    });
    this.appendChild(this.final_canvas);

    // Click to toggle video polling
    this.scratch_canvas.addEventListener("click", () => {
      if (this.video_polling) {
        this.pauseVideoPoll();
      } else {
        this.beginVideoPoll();
      }
    });
  }

  /**
   * Initialize all manager instances
   */
  setupManagers() {
    // Initialize camera manager
    this.cameraManager.initialize(() => {
      this.beginVideoPoll();
    });

    // Initialize image processor with current palette
    this.imageProcessor.setDitherMethod(this.dither_method);
    this.imageProcessor.setPalette(
      this.color1,
      this.color2,
      this.color3,
      this.color4,
      this.color5,
    );

    // Initialize export manager
    this.exportManager.initialize(this.scratch_canvas, this.final_canvas, this);

    // Initialize UI manager with callbacks
    this.uiManager.initialize(this, this.getUICallbacks());
  }

  /**
   * Get UI callback functions
   * @returns {Object} Object containing callback functions
   */
  getUICallbacks() {
    return {
      onFlip: () => {
        this.scratch_canvas_context.translate(this.eye_width, 0);
        this.scratch_canvas_context.scale(-1, 1);
      },

      onSliderChange: (type, value) => {
        this[type] = value;
        console.log(`${type} adjusted to:`, value);
      },

      onReset: () => {
        this.resetToDefaults();
      },

      onTakePicture: () => {
        this.exportManager.takePicture();
      },

      onDeviceChange: async (deviceId) => {
        this.cameraManager.setSelectedDevice(deviceId);
        await this.cameraManager.startStream();
      },

      onDitherMethodChange: (method) => {
        this.dither_method = method;
        this.imageProcessor.setDitherMethod(method);
        console.log("Dither method changed to:", method);
      },

      onExportLayers: () => {
        this.exportManager.exportRisographLayers(
          this.color1,
          this.color2,
          this.color3,
          this.color4,
          this.color5,
          this.eye_width,
          this.eye_height,
        );
      },

      onColorChange: (propertyName, newColor) => {
        this[propertyName] = newColor;
        this.imageProcessor.setPalette(
          this.color1,
          this.color2,
          this.color3,
          this.color4,
          this.color5,
        );
        // Update the corresponding attribute
        const attrName = propertyName.replace(/(\d)/, "-$1");
        this.setAttribute(attrName, newColor);
      },

      onSizeChange: (widthValue, heightValue, sizeUnit, dpi) => {
        this.width_value = widthValue;
        this.height_value = heightValue;
        this.size_unit = sizeUnit;
        this.dpi = dpi;

        // Calculate new pixel sizes
        const newPixelWidth = convertToPixels(widthValue, sizeUnit, dpi);
        const newPixelHeight = convertToPixels(heightValue, sizeUnit, dpi);
        this.eye_width = newPixelWidth;
        this.eye_height = newPixelHeight;

        // Update canvas sizes
        this.resizeCanvases();

        // Update attributes
        this.setAttribute("width-value", widthValue);
        this.setAttribute("height-value", heightValue);
        this.setAttribute("size-unit", sizeUnit);

        console.log(
          `Size changed to: ${widthValue}×${heightValue} ${sizeUnit} (${newPixelWidth}×${newPixelHeight}px)`,
        );
      },
    };
  }

  /**
   * Create all UI elements
   */
  createUI() {
    this.uiManager.createMenu();
    this.uiManager.createSizeSelector(
      this.width_value,
      this.height_value,
      this.size_unit,
      this.dpi,
    );
    this.uiManager.createFlipButton();
    this.uiManager.createImageSliders({
      contrast: this.contrast,
      saturation: this.saturation,
      brightness: this.brightness,
      hue: this.hue,
    });
    this.uiManager.createResetButton();
    this.uiManager.createTakePictureButton();
    this.uiManager.createBottomControls();
    this.uiManager.createColorPicker({
      color1: this.color1,
      color2: this.color2,
      color3: this.color3,
      color4: this.color4,
      color5: this.color5,
    });

    // Populate camera list
    this.updateCameraList();
  }

  /**
   * Resize canvases when size changes
   */
  resizeCanvases() {
    if (this.scratch_canvas && this.final_canvas) {
      // Update scratch canvas
      this.scratch_canvas.width = this.eye_width;
      this.scratch_canvas.height = this.eye_height;

      // Update final canvas
      this.final_canvas.width = this.eye_width;
      this.final_canvas.height = this.eye_height;

      console.log(
        `Canvases resized to: ${this.eye_width}×${this.eye_height}px`,
      );
    }
  }

  /**
   * Start camera and begin video processing
   */
  async startCamera() {
    try {
      await this.cameraManager.startStream();
    } catch (error) {
      console.error("Failed to start camera:", error);
    }
  }

  /**
   * Update camera device list in UI
   */
  async updateCameraList() {
    try {
      const devices = await this.cameraManager.getAvailableDevices();

      // Enhance device names
      const enhancedDevices = devices.map((device, index) => ({
        deviceId: device.deviceId,
        label: CameraManager.createDeviceName(device, index),
      }));

      this.uiManager.updateCameraList(
        enhancedDevices,
        this.cameraManager.selectedDevice,
      );

      // Set first device as default if none selected
      if (!this.cameraManager.selectedDevice && enhancedDevices.length > 0) {
        this.cameraManager.setSelectedDevice(enhancedDevices[0].deviceId);
      }
    } catch (error) {
      console.error("Error updating camera list:", error);
    }
  }

  /**
   * Reset all settings to default values
   */
  resetToDefaults() {
    this.contrast = DEFAULT_VALUES.CONTRAST;
    this.saturation = DEFAULT_VALUES.SATURATION;
    this.brightness = DEFAULT_VALUES.BRIGHTNESS;
    this.hue = DEFAULT_VALUES.HUE;

    this.uiManager.resetSliders({
      contrast: this.contrast,
      saturation: this.saturation,
      brightness: this.brightness,
      hue: this.hue,
    });
  }

  /**
   * Start video polling loop
   */
  async beginVideoPoll() {
    this.video_polling = true;
    this.video_poll = setInterval(
      () => this.pollVideo(),
      DEFAULT_VALUES.VIDEO_POLLING_INTERVAL,
    );
  }

  /**
   * Stop video polling loop
   */
  pauseVideoPoll() {
    this.video_polling = false;
    clearInterval(this.video_poll);
  }

  /**
   * Process single video frame
   */
  async pollVideo() {
    const video = this.cameraManager.getVideoElement();
    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    // Clear the canvas first
    this.scratch_canvas_context.clearRect(
      0,
      0,
      this.eye_width,
      this.eye_height,
    );

    // Calculate scaling to maintain aspect ratio
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = this.eye_width / this.eye_height;

    let drawWidth, drawHeight, drawX, drawY;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - fit by height
      drawHeight = this.eye_height;
      drawWidth = drawHeight * videoAspect;
      drawX = (this.eye_width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Video is taller than canvas - fit by width
      drawWidth = this.eye_width;
      drawHeight = drawWidth / videoAspect;
      drawX = 0;
      drawY = (this.eye_height - drawHeight) / 2;
    }

    // Apply CSS filters and draw video frame
    this.scratch_canvas_context.filter = `saturate(${this.saturation}%) brightness(${this.brightness}%) contrast(${this.contrast}%) hue-rotate(${this.hue}deg)`;
    await this.scratch_canvas_context.drawImage(
      video,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    // Get image data and apply dithering
    const img_data = this.scratch_canvas_context.getImageData(
      0,
      0,
      this.eye_width,
      this.eye_height,
    );
    const dithered_data = this.imageProcessor.applyDithering(img_data);

    // Display processed result
    this.final_canvas_context.putImageData(dithered_data, 0, 0);

    // Dispatch event with processed data
    this.dispatchEvent(
      new CustomEvent(EVENTS.IMAGE_DRAWN, {
        detail: dithered_data,
      }),
    );
  }

  /**
   * Draw a line on the final canvas overlay
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {number} lineWidth - Width of the line in pixels
   * @param {string} strokeStyle - Color of the line
   */
  drawLine(startX, startY, endX, endY, lineWidth = 1, strokeStyle = "red") {
    this.exportManager.drawLine(
      startX,
      startY,
      endX,
      endY,
      lineWidth,
      strokeStyle,
    );
  }

  // =============================================================================
  // WEB COMPONENT LIFECYCLE METHODS
  // =============================================================================

  /**
   * Called when the element is connected to the DOM
   */
  connectedCallback() {
    // Set initial values from HTML attributes with sensible defaults
    this.contrast =
      parseInt(this.getAttribute("contrast")) || DEFAULT_VALUES.CONTRAST;
    this.saturation =
      parseInt(this.getAttribute("saturation")) || DEFAULT_VALUES.SATURATION;
    this.brightness =
      parseInt(this.getAttribute("brightness")) || DEFAULT_VALUES.BRIGHTNESS;
    this.hue = parseInt(this.getAttribute("hue")) || DEFAULT_VALUES.HUE;
    this.color1 = this.getAttribute("color-1") || DEFAULT_VALUES.COLOR_1;
    this.color2 = this.getAttribute("color-2") || DEFAULT_VALUES.COLOR_2;
    this.color3 = this.getAttribute("color-3") || DEFAULT_VALUES.COLOR_3;
    this.color4 = this.getAttribute("color-4") || DEFAULT_VALUES.COLOR_4;
    this.color5 = this.getAttribute("color-5") || DEFAULT_VALUES.COLOR_5;
    this.dither_method =
      this.getAttribute("dither-method") || DEFAULT_VALUES.DITHER_METHOD;
    this.width_value =
      parseFloat(this.getAttribute("width-value")) ||
      DEFAULT_VALUES.WIDTH_VALUE;
    this.height_value =
      parseFloat(this.getAttribute("height-value")) ||
      DEFAULT_VALUES.HEIGHT_VALUE;
    this.size_unit = this.getAttribute("size-unit") || DEFAULT_VALUES.SIZE_UNIT;

    // Calculate initial eye dimensions from width/height values and unit
    this.eye_width = convertToPixels(
      this.width_value,
      this.size_unit,
      this.dpi,
    );
    this.eye_height = convertToPixels(
      this.height_value,
      this.size_unit,
      this.dpi,
    );

    this.render();
  }

  /**
   * Called when the element is disconnected from the DOM
   */
  disconnectedCallback() {
    // Stop video polling loop
    this.pauseVideoPoll();

    // Cleanup managers
    this.cameraManager.destroy();
    this.imageProcessor = null;
    this.uiManager.destroy();
    this.exportManager.destroy();
  }

  /**
   * Defines which HTML attributes should trigger attributeChangedCallback
   * @returns {string[]} Array of attribute names to observe
   */
  static get observedAttributes() {
    return OBSERVED_ATTRIBUTES;
  }

  /**
   * Called when any observed attribute changes
   * @param {string} name - Name of the changed attribute
   * @param {string} old_value - Previous attribute value
   * @param {string} new_value - New attribute value
   */
  attributeChangedCallback(name, old_value, new_value) {
    switch (name) {
      case "contrast":
        this.contrast = parseInt(new_value) || DEFAULT_VALUES.CONTRAST;
        this.uiManager.updateSlider("contrast", this.contrast);
        break;
      case "saturation":
        this.saturation = parseInt(new_value) || DEFAULT_VALUES.SATURATION;
        this.uiManager.updateSlider("saturation", this.saturation);
        break;
      case "brightness":
        this.brightness = parseInt(new_value) || DEFAULT_VALUES.BRIGHTNESS;
        this.uiManager.updateSlider("brightness", this.brightness);
        break;
      case "hue":
        this.hue = parseInt(new_value) || DEFAULT_VALUES.HUE;
        this.uiManager.updateSlider("hue", this.hue);
        break;
      case "color-1":
        this.color1 = new_value || DEFAULT_VALUES.COLOR_1;
        if (this.imageProcessor) {
          this.imageProcessor.setPalette(
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.color5,
          );
        }
        break;
      case "color-2":
        this.color2 = new_value || DEFAULT_VALUES.COLOR_2;
        if (this.imageProcessor) {
          this.imageProcessor.setPalette(
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.color5,
          );
        }
        break;
      case "color-3":
        this.color3 = new_value || DEFAULT_VALUES.COLOR_3;
        if (this.imageProcessor) {
          this.imageProcessor.setPalette(
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.color5,
          );
        }
        break;
      case "color-4":
        this.color4 = new_value || DEFAULT_VALUES.COLOR_4;
        if (this.imageProcessor) {
          this.imageProcessor.setPalette(
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.color5,
          );
        }
        break;
      case "color-5":
        this.color5 = new_value || DEFAULT_VALUES.COLOR_5;
        if (this.imageProcessor) {
          this.imageProcessor.setPalette(
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.color5,
          );
        }
        break;
      case "dither-method":
        this.dither_method = new_value || DEFAULT_VALUES.DITHER_METHOD;
        if (this.imageProcessor) {
          this.imageProcessor.setDitherMethod(this.dither_method);
        }
        this.uiManager.updateDitherMethod(this.dither_method);
        break;
      case "width-value":
        this.width_value = parseFloat(new_value) || DEFAULT_VALUES.WIDTH_VALUE;
        if (this.uiManager) {
          this.uiManager.updateSizeSelector(
            this.width_value,
            this.height_value,
            this.size_unit,
          );
        }
        // Recalculate eye_width
        this.eye_width = convertToPixels(
          this.width_value,
          this.size_unit,
          this.dpi,
        );
        this.resizeCanvases();
        break;
      case "height-value":
        this.height_value =
          parseFloat(new_value) || DEFAULT_VALUES.HEIGHT_VALUE;
        if (this.uiManager) {
          this.uiManager.updateSizeSelector(
            this.width_value,
            this.height_value,
            this.size_unit,
          );
        }
        // Recalculate eye_height
        this.eye_height = convertToPixels(
          this.height_value,
          this.size_unit,
          this.dpi,
        );
        this.resizeCanvases();
        break;
      case "size-unit":
        this.size_unit = new_value || DEFAULT_VALUES.SIZE_UNIT;
        if (this.uiManager) {
          this.uiManager.updateSizeSelector(
            this.width_value,
            this.height_value,
            this.size_unit,
          );
        }
        // Recalculate eye dimensions
        this.eye_width = convertToPixels(
          this.width_value,
          this.size_unit,
          this.dpi,
        );
        this.eye_height = convertToPixels(
          this.height_value,
          this.size_unit,
          this.dpi,
        );
        this.resizeCanvases();
        break;
      default:
        // Unhandled attribute
        console.warn(`Unhandled attribute change: ${name}`);
    }
  }
}

/**
 * Register the custom element
 * - 'EYE' represents the camera/vision aspect of the component
 */
customElements.define("e-y-e", EYE);
