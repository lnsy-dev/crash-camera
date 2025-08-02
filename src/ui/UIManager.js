/**
 * UIManager - Handles all user interface creation and management
 * Creates and manages sliders, buttons, dropdowns, and other UI elements
 */

import {
  DITHER_METHODS,
  SLIDER_CONFIGS,
  CSS_CLASSES,
} from "../utils/Constants.js";
import { colorNameToHex } from "../utils/ColorUtils.js";

export class UIManager {
  constructor() {
    this.elements = {};
    this.callbacks = {};
    this.parentElement = null;
  }

  /**
   * Initialize the UI manager with parent element and callbacks
   * @param {HTMLElement} parentElement - Container element for UI
   * @param {Object} callbacks - Object containing callback functions
   */
  initialize(parentElement, callbacks) {
    this.parentElement = parentElement;
    this.callbacks = callbacks;
  }

  /**
   * Create the main collapsible menu interface
   * Uses HTML5 details/summary elements for accessible dropdown functionality
   */
  createMenu() {
    const menuContainer = document.createElement("details");
    const summary = document.createElement("summary");
    menuContainer.appendChild(summary);

    this.elements.menu = document.createElement("section");
    menuContainer.appendChild(this.elements.menu);
    this.parentElement.appendChild(menuContainer);

    // Handle click outside to close menu
    const details = [menuContainer];
    document.addEventListener("click", function (e) {
      if (!details.some((f) => f.contains(e.target))) {
        details.forEach((f) => f.removeAttribute("open"));
      } else {
        details.forEach((f) =>
          !f.contains(e.target) ? f.removeAttribute("open") : "",
        );
      }
    });
  }

  /**
   * Create flip image toggle button
   */
  createFlipButton() {
    const flipButtonLabel = document.createElement("label");
    flipButtonLabel.innerText = "Flip Image";
    const flipCheckbox = document.createElement("input");
    flipCheckbox.setAttribute("type", "checkbox");
    flipButtonLabel.appendChild(flipCheckbox);
    this.elements.menu.appendChild(flipButtonLabel);

    flipCheckbox.addEventListener("click", () => {
      if (this.callbacks.onFlip) {
        this.callbacks.onFlip();
      }
    });

    this.elements.flipCheckbox = flipCheckbox;
  }

  /**
   * Create a slider for image adjustments
   * @param {string} type - Slider type (contrast, saturation, brightness, hue)
   * @param {string} label - Display label
   * @param {number} defaultValue - Default slider value
   */
  createSlider(type, label, defaultValue) {
    const config = SLIDER_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown slider type: ${type}`);
    }

    const sliderLabel = document.createElement("label");
    sliderLabel.innerText = label;
    const slider = document.createElement("input");
    slider.setAttribute("type", "range");
    slider.setAttribute("min", config.min);
    slider.setAttribute("max", config.max);
    slider.value = defaultValue;

    sliderLabel.appendChild(slider);
    this.elements.menu.appendChild(sliderLabel);

    slider.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.callbacks.onSliderChange) {
        this.callbacks.onSliderChange(type, value);
      }
      console.log(`${label} adjusted to:`, value);
    });

    this.elements[`${type}Slider`] = slider;
  }

  /**
   * Create all image adjustment sliders
   * @param {Object} defaultValues - Default values for each slider
   */
  createImageSliders(defaultValues) {
    this.createSlider("contrast", "Contrast", defaultValues.contrast);
    this.createSlider("saturation", "Saturate", defaultValues.saturation);
    this.createSlider("brightness", "Brightness", defaultValues.brightness);
    this.createSlider("hue", "Hue", defaultValues.hue);
  }

  /**
   * Create reset button for sliders
   */
  createResetButton() {
    const resetButtonLabel = document.createElement("label");
    const resetButton = document.createElement("button");
    resetButton.innerText = "Reset";
    resetButtonLabel.appendChild(resetButton);
    this.elements.menu.appendChild(resetButtonLabel);

    resetButton.addEventListener("click", () => {
      if (this.callbacks.onReset) {
        this.callbacks.onReset();
      }
    });

    this.elements.resetButton = resetButton;
  }

  /**
   * Create take picture button
   */
  createTakePictureButton() {
    const takePictureLabel = document.createElement("label");
    this.elements.takePictureButton = document.createElement("button");
    this.elements.takePictureButton.classList.add("take-picture-button");
    this.elements.takePictureButton.innerText = "Take Picture";

    this.elements.takePictureButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.callbacks.onTakePicture) {
        this.callbacks.onTakePicture();
      }
    });

    takePictureLabel.appendChild(this.elements.takePictureButton);
    this.elements.menu.appendChild(takePictureLabel);
  }

  /**
   * Create bottom controls container with camera, dithering, and export controls
   */
  createBottomControls() {
    const bottomContainer = document.createElement("div");
    bottomContainer.className = CSS_CLASSES.bottomContainer;

    // Camera select dropdown
    this.createDeviceDropdown(bottomContainer);

    // Dithering method selector
    this.createDitherSelector(bottomContainer);

    // Export layers button
    this.createExportButton(bottomContainer);

    this.parentElement.appendChild(bottomContainer);
    this.elements.bottomContainer = bottomContainer;
  }

  /**
   * Create camera device selection dropdown
   * @param {HTMLElement} container - Container element
   */
  createDeviceDropdown(container) {
    const selectionWrapper = document.createElement("div");
    selectionWrapper.className = CSS_CLASSES.controlWrapper;

    const selectionLabel = document.createElement("label");
    selectionLabel.innerText = "Camera: ";

    const videoInputs = document.createElement("select");

    videoInputs.addEventListener("change", (e) => {
      if (this.callbacks.onDeviceChange) {
        this.callbacks.onDeviceChange(e.target.value);
      }
    });

    selectionWrapper.appendChild(selectionLabel);
    selectionWrapper.appendChild(videoInputs);
    container.appendChild(selectionWrapper);

    this.elements.cameraSelect = videoInputs;
  }

  /**
   * Update camera list in dropdown
   * @param {Array} devices - Array of camera devices
   * @param {string} selectedDeviceId - Currently selected device ID
   */
  updateCameraList(devices, selectedDeviceId) {
    if (!this.elements.cameraSelect) return;

    // Clear existing options
    this.elements.cameraSelect.innerHTML = "";

    // Add devices to dropdown
    devices.forEach((device, index) => {
      const option = document.createElement("option");
      option.setAttribute("value", device.deviceId);
      option.innerText = device.label || `Camera ${index + 1}`;
      this.elements.cameraSelect.appendChild(option);
    });

    // Set selected device
    if (selectedDeviceId) {
      this.elements.cameraSelect.value = selectedDeviceId;
    }
  }

  /**
   * Create dithering method selector
   * @param {HTMLElement} container - Container element
   */
  createDitherSelector(container) {
    const ditherWrapper = document.createElement("div");
    ditherWrapper.className = CSS_CLASSES.controlWrapper;

    const ditherLabel = document.createElement("label");
    ditherLabel.innerText = "Dithering: ";

    const ditherSelect = document.createElement("select");

    DITHER_METHODS.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.innerText = option.label;
      ditherSelect.appendChild(opt);
    });

    ditherSelect.addEventListener("change", (e) => {
      if (this.callbacks.onDitherMethodChange) {
        this.callbacks.onDitherMethodChange(e.target.value);
      }
    });

    ditherWrapper.appendChild(ditherLabel);
    ditherWrapper.appendChild(ditherSelect);
    container.appendChild(ditherWrapper);

    this.elements.ditherSelect = ditherSelect;
  }

  /**
   * Create export layers button
   * @param {HTMLElement} container - Container element
   */
  createExportButton(container) {
    const exportButton = document.createElement("button");
    exportButton.className = CSS_CLASSES.exportButton;
    exportButton.innerText = "Export Layers";

    exportButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.callbacks.onExportLayers) {
        this.callbacks.onExportLayers();
      }
    });

    container.appendChild(exportButton);
    this.elements.exportButton = exportButton;
  }

  /**
   * Create color picker interface
   * @param {Object} colors - Current color values
   */
  createColorPicker(colors) {
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.className = CSS_CLASSES.colorPickerContainer;

    // Create color inputs for each color
    this.createColorInput(
      colorPickerContainer,
      "Color 1",
      "color1",
      colors.color1,
    );
    this.createColorInput(
      colorPickerContainer,
      "Color 2",
      "color2",
      colors.color2,
    );
    this.createColorInput(
      colorPickerContainer,
      "Color 3",
      "color3",
      colors.color3,
    );
    this.createColorInput(
      colorPickerContainer,
      "Color 4",
      "color4",
      colors.color4,
    );
    this.createColorInput(
      colorPickerContainer,
      "Color 5",
      "color5",
      colors.color5,
    );

    this.parentElement.appendChild(colorPickerContainer);
    this.elements.colorPickerContainer = colorPickerContainer;
  }

  /**
   * Create individual color input
   * @param {HTMLElement} container - Container element
   * @param {string} labelText - Label text
   * @param {string} propertyName - Property name for callbacks
   * @param {string} defaultColor - Default color value
   */
  createColorInput(container, labelText, propertyName, defaultColor) {
    const colorRow = document.createElement("div");
    colorRow.className = CSS_CLASSES.colorRow;

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = colorNameToHex(defaultColor);
    colorInput.className = CSS_CLASSES.colorInput;

    colorInput.addEventListener("change", (e) => {
      const newColor = e.target.value;
      if (this.callbacks.onColorChange) {
        this.callbacks.onColorChange(propertyName, newColor);
      }
      console.log(`${labelText} changed to:`, newColor);
    });

    colorRow.appendChild(colorInput);
    container.appendChild(colorRow);

    // Store reference for easy access
    this.elements[`${propertyName}Input`] = colorInput;
  }

  /**
   * Reset all sliders to default values
   * @param {Object} defaultValues - Default values for sliders
   */
  resetSliders(defaultValues) {
    if (this.elements.contrastSlider) {
      this.elements.contrastSlider.value = defaultValues.contrast;
    }
    if (this.elements.saturationSlider) {
      this.elements.saturationSlider.value = defaultValues.saturation;
    }
    if (this.elements.brightnessSlider) {
      this.elements.brightnessSlider.value = defaultValues.brightness;
    }
    if (this.elements.hueSlider) {
      this.elements.hueSlider.value = defaultValues.hue;
    }
  }

  /**
   * Update slider value
   * @param {string} type - Slider type
   * @param {number} value - New value
   */
  updateSlider(type, value) {
    const slider = this.elements[`${type}Slider`];
    if (slider) {
      slider.value = value;
    }
  }

  /**
   * Update dither method selection
   * @param {string} method - Dither method
   */
  updateDitherMethod(method) {
    if (this.elements.ditherSelect) {
      this.elements.ditherSelect.value = method;
    }
  }

  /**
   * Get UI element by name
   * @param {string} name - Element name
   * @returns {HTMLElement} UI element
   */
  getElement(name) {
    return this.elements[name];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.elements = {};
    this.callbacks = {};
    this.parentElement = null;
  }
}
