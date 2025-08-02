/**
 * UIManager - Handles all user interface creation and management
 * Creates and manages sliders, buttons, dropdowns, and other UI elements
 */

import {
  DITHER_METHODS,
  SLIDER_CONFIGS,
  CSS_CLASSES,
  SIZE_UNITS,
} from "../utils/Constants.js";
import { colorNameToHex } from "../utils/ColorUtils.js";
import {
  convertToPixels,
  getSizeUnitConfig,
  clampSizeValue,
  formatSizeDisplay,
} from "../utils/SizeUtils.js";

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
   * Create size selector with unit dropdown and separate width/height inputs
   * @param {number} widthValue - Current width value
   * @param {number} heightValue - Current height value
   * @param {string} sizeUnit - Current size unit
   * @param {number} dpi - DPI for pixel conversion
   */
  createSizeSelector(widthValue, heightValue, sizeUnit, dpi) {
    const sizeContainer = document.createElement("div");
    sizeContainer.style.display = "flex";
    sizeContainer.style.flexDirection = "column";
    sizeContainer.style.gap = "5px";
    sizeContainer.style.marginBottom = "10px";

    // Size label
    const sizeLabel = document.createElement("label");
    sizeLabel.innerText = "Image Size";
    sizeLabel.style.fontWeight = "bold";
    sizeContainer.appendChild(sizeLabel);

    // Unit dropdown container
    const unitContainer = document.createElement("div");
    unitContainer.style.display = "flex";
    unitContainer.style.gap = "5px";
    unitContainer.style.alignItems = "center";
    unitContainer.style.marginBottom = "5px";

    const unitLabel = document.createElement("span");
    unitLabel.innerText = "Unit:";
    unitLabel.style.fontSize = "0.9em";

    // Unit dropdown
    const unitSelect = document.createElement("select");
    SIZE_UNITS.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.value;
      option.innerText = unit.label;
      unitSelect.appendChild(option);
    });
    unitSelect.value = sizeUnit;

    unitContainer.appendChild(unitLabel);
    unitContainer.appendChild(unitSelect);
    sizeContainer.appendChild(unitContainer);

    // Width controls
    const widthContainer = document.createElement("div");
    widthContainer.style.display = "flex";
    widthContainer.style.gap = "5px";
    widthContainer.style.alignItems = "center";

    const widthLabel = document.createElement("span");
    widthLabel.innerText = "W:";
    widthLabel.style.fontSize = "0.9em";
    widthLabel.style.minWidth = "20px";

    const widthInput = document.createElement("input");
    widthInput.type = "number";
    widthInput.value = widthValue;
    widthInput.style.width = "70px";

    widthContainer.appendChild(widthLabel);
    widthContainer.appendChild(widthInput);
    sizeContainer.appendChild(widthContainer);

    // Height controls
    const heightContainer = document.createElement("div");
    heightContainer.style.display = "flex";
    heightContainer.style.gap = "5px";
    heightContainer.style.alignItems = "center";

    const heightLabel = document.createElement("span");
    heightLabel.innerText = "H:";
    heightLabel.style.fontSize = "0.9em";
    heightLabel.style.minWidth = "20px";

    const heightInput = document.createElement("input");
    heightInput.type = "number";
    heightInput.value = heightValue;
    heightInput.style.width = "70px";

    heightContainer.appendChild(heightLabel);
    heightContainer.appendChild(heightInput);
    sizeContainer.appendChild(heightContainer);

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.innerText = "Apply Size";
    submitButton.style.marginTop = "5px";
    submitButton.style.padding = "4px 8px";
    submitButton.style.fontSize = "0.9em";
    sizeContainer.appendChild(submitButton);

    // Update input constraints based on unit
    const updateInputConstraints = () => {
      const unitConfig = getSizeUnitConfig(unitSelect.value, SIZE_UNITS);
      if (unitConfig) {
        widthInput.min = unitConfig.min;
        widthInput.max = unitConfig.max;
        widthInput.step = unitConfig.step;
        heightInput.min = unitConfig.min;
        heightInput.max = unitConfig.max;
        heightInput.step = unitConfig.step;
      }
    };

    updateInputConstraints();

    // Event listeners
    const handleSizeChange = () => {
      const width = parseFloat(widthInput.value);
      const height = parseFloat(heightInput.value);
      const unit = unitSelect.value;

      if (!isNaN(width) && !isNaN(height)) {
        const clampedWidth = clampSizeValue(width, unit, SIZE_UNITS);
        const clampedHeight = clampSizeValue(height, unit, SIZE_UNITS);

        if (clampedWidth !== width) {
          widthInput.value = clampedWidth;
        }
        if (clampedHeight !== height) {
          heightInput.value = clampedHeight;
        }

        if (this.callbacks.onSizeChange) {
          this.callbacks.onSizeChange(clampedWidth, clampedHeight, unit, dpi);
        }
      }
    };

    unitSelect.addEventListener("change", () => {
      updateInputConstraints();
    });

    submitButton.addEventListener("click", handleSizeChange);

    this.elements.menu.appendChild(sizeContainer);
    this.elements.widthInput = widthInput;
    this.elements.heightInput = heightInput;
    this.elements.unitSelect = unitSelect;
    this.elements.submitButton = submitButton;
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

    // Image upload button
    this.createUploadImageButton(bottomContainer);

    // Close upload button (initially hidden)
    this.createCloseUploadButton(bottomContainer);

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
   * Create upload image button
   * @param {HTMLElement} container - Parent container element
   */
  createUploadImageButton(container) {
    const uploadButton = document.createElement("button");
    uploadButton.className = CSS_CLASSES.uploadButton;
    uploadButton.innerText = "Upload Image";

    // Create hidden file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    uploadButton.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && this.callbacks.onImageUpload) {
        this.callbacks.onImageUpload(file);
        // Clear the input so the same file can be uploaded again
        fileInput.value = "";
      }
    });

    container.appendChild(uploadButton);
    container.appendChild(fileInput);
    this.elements.uploadButton = uploadButton;
    this.elements.fileInput = fileInput;
  }

  /**
   * Create close upload button
   * @param {HTMLElement} container - Parent container element
   */
  createCloseUploadButton(container) {
    const closeButton = document.createElement("button");
    closeButton.className = CSS_CLASSES.closeUploadButton;
    closeButton.innerText = "Close Uploaded Image";
    closeButton.style.display = "none"; // Initially hidden

    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.callbacks.onCloseUpload) {
        this.callbacks.onCloseUpload();
      }
    });

    container.appendChild(closeButton);
    this.elements.closeUploadButton = closeButton;
  }

  /**
   * Show or hide upload-related buttons based on upload state
   * @param {boolean} isUploaded - Whether an image is currently uploaded
   */
  toggleUploadButtons(isUploaded) {
    if (this.elements.uploadButton) {
      this.elements.uploadButton.style.display = isUploaded
        ? "none"
        : "inline-block";
    }
    if (this.elements.closeUploadButton) {
      this.elements.closeUploadButton.style.display = isUploaded
        ? "inline-block"
        : "none";
    }
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
   * Update size selector values
   * @param {number} widthValue - New width value
   * @param {number} heightValue - New height value
   * @param {string} sizeUnit - New size unit
   */
  updateSizeSelector(widthValue, heightValue, sizeUnit) {
    if (this.elements.widthInput) {
      this.elements.widthInput.value = widthValue;
    }
    if (this.elements.heightInput) {
      this.elements.heightInput.value = heightValue;
    }
    if (this.elements.unitSelect) {
      this.elements.unitSelect.value = sizeUnit;
      // Update input constraints
      const unitConfig = getSizeUnitConfig(sizeUnit, SIZE_UNITS);
      if (unitConfig) {
        if (this.elements.widthInput) {
          this.elements.widthInput.min = unitConfig.min;
          this.elements.widthInput.max = unitConfig.max;
          this.elements.widthInput.step = unitConfig.step;
        }
        if (this.elements.heightInput) {
          this.elements.heightInput.min = unitConfig.min;
          this.elements.heightInput.max = unitConfig.max;
          this.elements.heightInput.step = unitConfig.step;
        }
      }
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
