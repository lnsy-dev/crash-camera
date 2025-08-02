
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
 * @version 1.0.0
 */
class EYE extends HTMLElement {
    
    // =============================================================================
    // CLASS PROPERTIES
    // =============================================================================
    
    /** @type {boolean} Whether video polling is currently active */
    video_polling = false;
    
    /** @type {boolean} Whether the image should be horizontally flipped */
    flipped = false;
    
    /** @type {number} Canvas size in pixels (square format for risograph) */
    eye_size = 900;
    
    /** @type {number} Image contrast level (0-300, default 100) */
    contrast = 100;
    
    /** @type {number} Image saturation level (0-300, default 100) */
    saturation = 100; 
    
    /** @type {number} Image brightness level (0-300, default 100) */
    brightness = 100;
    
    /** @type {number} Image hue rotation in degrees (0-360, default 0) */
    hue = 0;
    
    /** @type {string|null} Currently selected camera device ID */
    selected_device = null;
    
    /** @type {string} First risograph ink color */
    color1 = 'black';
    
    /** @type {string} Second risograph ink color */
    color2 = 'orange'; 
    
    /** @type {string} Third risograph ink color */
    color3 = 'blue';
    
    /** @type {string} Fourth risograph ink color */
    color4 = 'pink';
    
    /** @type {string} Fifth risograph ink color */
    color5 = 'red';
    
    /** @type {string} Current dithering algorithm method */
    dither_method = 'floyd-steinberg';
    
    // =============================================================================
    // LIFECYCLE METHODS
    // =============================================================================
    
    /**
     * Renders the initial connection interface
     * Creates a "Connect" button that initializes the camera interface when clicked
     */
    render() {
      const initialize_button = document.createElement('button');
      initialize_button.classList.add('initialize-button')
      initialize_button.innerText = 'Connect';
      initialize_button.addEventListener('click', (e) => {
        this.openEYE();
      });
      this.appendChild(initialize_button);
    }
  
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    /**
     * Draws a line on the final canvas overlay
     * Useful for adding visual guides or annotations to the camera feed
     * 
     * @param {number} startX - Starting X coordinate
     * @param {number} startY - Starting Y coordinate  
     * @param {number} endX - Ending X coordinate
     * @param {number} endY - Ending Y coordinate
     * @param {number} lineWidth - Width of the line in pixels (default: 1)
     * @param {string} strokeStyle - Color of the line (default: 'red')
     */
    drawLine(startX, startY, endX, endY, lineWidth = 1, strokeStyle = 'red'){
      const ctx = this.final_canvas_context;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }

    // =============================================================================
    // COLOR PROCESSING METHODS
    // =============================================================================
    
    /**
     * Converts any CSS color (name, hex, rgb, etc.) to RGB array
     * Uses canvas rendering to handle all CSS color formats consistently
     * 
     * @param {string} color - CSS color value (e.g., 'red', '#FF0000', 'rgb(255,0,0)')
     * @returns {number[]} RGB array [r, g, b] where each value is 0-255
     */
    colorToRgb(color) {
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
    colorDistance(rgb1, rgb2) {
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
    findClosestColor(rgb, palette) {
      let closestColor = palette[0];
      let minDistance = this.colorDistance(rgb, palette[0]);
      
      for (let i = 1; i < palette.length; i++) {
        const distance = this.colorDistance(rgb, palette[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = palette[i];
        }
      }
      return closestColor;
    }

    // =============================================================================
    // DITHERING ALGORITHMS
    // =============================================================================
    
    /**
     * Main dithering function that applies the selected algorithm
     * Converts full-color image data to a limited color palette using dithering
     * 
     * The palette always includes white (paper color) plus the 5 configurable ink colors.
     * This creates a 6-color palette optimized for risograph printing workflows.
     * 
     * @param {ImageData} imageData - Canvas ImageData object to process
     * @returns {ImageData} Processed ImageData with colors reduced to palette
     */
    applyDithering(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      // Build 6-color palette: white (paper) + 5 configurable ink colors
      const palette = [
        [255, 255, 255], // White - represents paper/no ink
        this.colorToRgb(this.color1),
        this.colorToRgb(this.color2),
        this.colorToRgb(this.color3),
        this.colorToRgb(this.color4),
        this.colorToRgb(this.color5)
      ];

      console.log('Dithering with method:', this.dither_method, 'and palette:', {
        white: 'white',
        color1: this.color1,
        color2: this.color2,
        color3: this.color3,
        color4: this.color4,
        color5: this.color5,
        rgbPalette: palette
      });

      // Route to appropriate dithering algorithm
      if (this.dither_method === 'threshold') {
        return this.applyThresholdDithering(imageData, palette);
      } else {
        return this.applyErrorDiffusionDithering(imageData, palette, this.dither_method);
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
          const newPixel = this.findClosestColor(oldPixel, palette);
          
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
      // Each entry: { x: horizontal offset, y: vertical offset, factor: error weight }
      // Factors represent the fraction of error to distribute to each neighboring pixel
      const diffusionMatrices = {
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

      // Select diffusion matrix for the chosen algorithm (fallback to Floyd-Steinberg)
      const matrix = diffusionMatrices[method] || diffusionMatrices['floyd-steinberg'];

      // Process pixels from top-left to bottom-right for proper error propagation
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const oldPixel = [data[idx], data[idx + 1], data[idx + 2]];
          const newPixel = this.findClosestColor(oldPixel, palette);
          
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
  
    // =============================================================================
    // UI CREATION METHODS
    // =============================================================================
    
    /**
     * Creates the main collapsible menu interface
     * Uses HTML5 details/summary elements for accessible dropdown functionality
     */
    createMenu(){
      const menu_container = document.createElement('details');
      const summary = document.createElement('summary');
      menu_container.appendChild(summary);
      this.menu = document.createElement('section');
      menu_container.appendChild(this.menu);
      this.appendChild(menu_container);
    }
  
    createFlipButton(){
      const flip_button_label = document.createElement('label');
      flip_button_label.innerText = 'Flip Image';
      const flip_checkbox = document.createElement('input');
      flip_checkbox.setAttribute('type', 'checkbox');
      flip_button_label.appendChild(flip_checkbox);
      this.menu.appendChild(flip_button_label);
      flip_checkbox.addEventListener('click', (e) => {
        this.scratch_canvas_context.translate(this.eye_size, 0);
        this.scratch_canvas_context.scale(-1, 1);      
      });
    }
  
    createContrastSlider(){
      const contrast_slider_label = document.createElement('label');
      contrast_slider_label.innerText = 'Contrast';
      const contrast_slider = document.createElement('input');
      contrast_slider.setAttribute('type', 'range');
      contrast_slider.setAttribute('min', 0);
      contrast_slider.setAttribute('max', 300);
      contrast_slider.value = 100; 
      contrast_slider_label.appendChild(contrast_slider);
      this.menu.appendChild(contrast_slider_label);
      contrast_slider.addEventListener('change', (e) => {
        this.contrast = e.target.value;
        console.log('Contrast adjusted to:', this.contrast);
      });
  
      this.contrast_slider = contrast_slider;
    }
  
    createSaturationSlider(){
      const saturation_slider_label = document.createElement('label');
      saturation_slider_label.innerText = 'Saturate';
      const saturation_slider = document.createElement('input');
      saturation_slider.setAttribute('type', 'range');
      saturation_slider.setAttribute('min', 0);
      saturation_slider.setAttribute('max', 300);
      saturation_slider.value = 100; 
      saturation_slider_label.appendChild(saturation_slider);
      this.menu.appendChild(saturation_slider_label);
      saturation_slider.addEventListener('change', (e) => {
        this.saturation = e.target.value;
        console.log('Saturation adjusted to:', this.saturation);
      });
      this.saturation_slider = saturation_slider;
    }
  
    createBrightnessSlider(){
      const Brightness_slider_label = document.createElement('label');
      Brightness_slider_label.innerText = 'Brightness';
      const Brightness_slider = document.createElement('input');
      Brightness_slider.setAttribute('type', 'range');
      Brightness_slider.setAttribute('min', 0);
      Brightness_slider.setAttribute('max', 300);
      Brightness_slider.value = 100; 
      Brightness_slider_label.appendChild(Brightness_slider);
      this.menu.appendChild(Brightness_slider_label);
      Brightness_slider.addEventListener('change', (e) => {
        this.brightness = e.target.value;
        console.log('Brightness adjusted to:', this.brightness);
      });
  
      this.brightness_slider = Brightness_slider
    }
  
    createhueSlider(){
      const hue_slider_label = document.createElement('label');
      hue_slider_label.innerText = 'hue';
      const hue_slider = document.createElement('input');
      hue_slider.setAttribute('type', 'range');
      hue_slider.setAttribute('min', 0);
      hue_slider.setAttribute('max', 360);
      hue_slider.value = 180; 
      hue_slider_label.appendChild(hue_slider);
      this.menu.appendChild(hue_slider_label);
      hue_slider.addEventListener('change', (e) => {
        this.hue = e.target.value;
        console.log('Hue adjusted to:', this.hue);
      });
  
      this.hue_slider = hue_slider
    }
  
        createBottomDitherSelector(container){
      const dither_wrapper = document.createElement('div');
      dither_wrapper.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        padding: 10px;
        border-radius: 5px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      
      const dither_label = document.createElement('label');
      dither_label.innerText = 'Dithering: ';
      dither_label.style.cssText = 'margin: 0; font-size: 14px;';
      
      const dither_select = document.createElement('select');
      dither_select.style.cssText = `
        padding: 5px;
        border-radius: 3px;
        border: none;
        background: white;
        color: black;
        font-size: 14px;
      `;
      
      const dither_options = [
        { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
        { value: 'atkinson', label: 'Atkinson' },
        { value: 'burkes', label: 'Burkes' },
        { value: 'sierra', label: 'Sierra' },
        { value: 'stucki', label: 'Stucki' },
        { value: 'jarvis', label: 'Jarvis-Judice-Ninke' },
        { value: 'threshold', label: 'Simple Threshold' }
      ];
      
      dither_options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.innerText = option.label;
        dither_select.appendChild(opt);
      });
      
      dither_select.value = this.dither_method;
      this.dither_select = dither_select;
      
      dither_select.addEventListener('change', (e) => {
        this.dither_method = e.target.value;
        console.log('Dither method changed to:', this.dither_method);
      });
      
      dither_wrapper.appendChild(dither_label);
      dither_wrapper.appendChild(dither_select);
      container.appendChild(dither_wrapper);
    }

    createResetButton(){
      const reset_button_label = document.createElement('label');
      const reset_button = document.createElement('button');
      reset_button.innerText = 'Reset'
      reset_button_label.appendChild(reset_button);
      this.menu.appendChild(reset_button_label);
      reset_button.addEventListener('click', (e)=>{
        this.contrast_slider.value = 100;
        this.brightness_slider.value = 100;
        this.saturation_slider.value = 100;
        this.hue_slider.value = 0;

        this.contrast = 100;
        this.saturation = 100; 
        this.brightness = 100;
        this.hue = 0;

      });
    }
  

  
        createTakePictureButton(){
      const take_picture_label = document.createElement('label');
      this.take_picture_button = document.createElement('button');
      this.take_picture_button.classList.add('take-picture-button');
      this.take_picture_button.innerText = 'Take Picture';
      this.take_picture_button.addEventListener('click', (e)=>{
        e.preventDefault();
        this.takePicture();
      });

      take_picture_label.appendChild(this.take_picture_button);
      this.menu.appendChild(take_picture_label);
    }

    createBottomControls(){
      const bottom_container = document.createElement('div');
      bottom_container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 15px;
        z-index: 1000;
      `;

      // Camera select dropdown
      this.createBottomDeviceDropdown(bottom_container);
      
      // Dithering method selector
      this.createBottomDitherSelector(bottom_container);
      
      // Export layers button
      this.createBottomExportButton(bottom_container);

      this.appendChild(bottom_container);
    }

    async createBottomDeviceDropdown(container){
      const selection_wrapper = document.createElement('div');
      selection_wrapper.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        padding: 10px;
        border-radius: 5px;
        color: white;
      `;
      
      const selection_label = document.createElement('label');
      selection_label.innerText = 'Camera: ';
      selection_label.style.cssText = 'margin-right: 10px;';
      
      const video_inputs = document.createElement('select');
      video_inputs.style.cssText = `
        padding: 5px;
        border-radius: 3px;
        border: none;
      `;
      
      // Store reference for later updates
      this.camera_select = video_inputs;
      
      video_inputs.addEventListener('change', (e) => {
        this.selected_device = e.target.value;
        console.log('Selected camera device:', this.selected_device);
        this.getUserMedia();
      });
      
      selection_wrapper.appendChild(selection_label);
      selection_wrapper.appendChild(video_inputs);
      container.appendChild(selection_wrapper);

      // Populate the dropdown with available cameras
      await this.updateCameraList();
    }

    async updateCameraList() {
      try {
        // First, request permissions to get full device info
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        // Now enumerate devices with proper labels
        const connected_devices = await navigator.mediaDevices.enumerateDevices();
        const video_devices = connected_devices.filter(d => d.kind === 'videoinput');
        
        console.log('Available video devices:', video_devices);
        
        // Clear existing options
        this.camera_select.innerHTML = '';
        
        // Add devices to dropdown
        video_devices.forEach((device, index) => {
          const option = document.createElement('option');
          option.setAttribute('value', device.deviceId);
          
          // Use device label if available, otherwise create a descriptive name
          let deviceName = device.label;
          if (!deviceName || deviceName === '') {
            // On mobile, try to identify front/back cameras
            if (device.deviceId.includes('front') || index === 1) {
              deviceName = `Front Camera ${index + 1}`;
            } else if (device.deviceId.includes('back') || index === 0) {
              deviceName = `Back Camera ${index + 1}`;
            } else {
              deviceName = `Camera ${index + 1}`;
            }
          }
          
          option.innerText = deviceName;
          this.camera_select.appendChild(option);
        });

        // Set the first device as selected if none is selected
        if (!this.selected_device && video_devices.length > 0) {
          this.selected_device = video_devices[0].deviceId;
          this.camera_select.value = this.selected_device;
        }
        
      } catch (error) {
        console.error('Error getting camera permissions or enumerating devices:', error);
        
        // Fallback: add generic options for mobile
        const fallback_options = [
          { deviceId: '', label: 'Default Camera' },
          { deviceId: 'front', label: 'Front Camera' },
          { deviceId: 'back', label: 'Back Camera' }
        ];
        
        this.camera_select.innerHTML = '';
        fallback_options.forEach((device, index) => {
          const option = document.createElement('option');
          option.setAttribute('value', device.deviceId);
          option.innerText = device.label;
          this.camera_select.appendChild(option);
        });
      }
    }

    createBottomExportButton(container){
      const export_button = document.createElement('button');
      export_button.classList.add('export-layers-button');
      export_button.innerText = 'Export Layers';
      export_button.style.cssText = `
        background: #ff6b35;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        transition: background 0.2s;
      `;
      
      export_button.addEventListener('mouseenter', () => {
        export_button.style.background = '#e55529';
      });
      
      export_button.addEventListener('mouseleave', () => {
        export_button.style.background = '#ff6b35';
      });
      
      export_button.addEventListener('click', (e)=>{
        e.preventDefault();
        this.exportRisographLayers();
      });

      container.appendChild(export_button);
    }

    createColorPicker(){
      const color_picker_container = document.createElement('div');
      color_picker_container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        padding: 15px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `;

      // Color 1
      this.createColorInput(color_picker_container, 'Color 1', 'color1', this.color1);
      
      // Color 2
      this.createColorInput(color_picker_container, 'Color 2', 'color2', this.color2);
      
      // Color 3
      this.createColorInput(color_picker_container, 'Color 3', 'color3', this.color3);
      
      // Color 4
      this.createColorInput(color_picker_container, 'Color 4', 'color4', this.color4);
      
      // Color 5
      this.createColorInput(color_picker_container, 'Color 5', 'color5', this.color5);

      this.appendChild(color_picker_container);
    }

    createColorInput(container, labelText, propertyName, defaultColor) {
      const color_row = document.createElement('div');
      color_row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const color_input = document.createElement('input');
      color_input.type = 'color';
      color_input.value = this.colorNameToHex(defaultColor);
      color_input.style.cssText = `
        width: 40px;
        height: 30px;
        border: 2px solid #333;
        border-radius: 4px;
        cursor: pointer;
        background: none;
      `;

      // Store reference for easy access
      this[`${propertyName}_input`] = color_input;

      color_input.addEventListener('change', (e) => {
        const newColor = e.target.value;
        this[propertyName] = newColor;
        console.log(`${labelText} changed to:`, newColor);
        
        // Update the corresponding attribute
        const attrName = propertyName.replace(/(\d)/, '-$1');
        this.setAttribute(attrName, newColor);
      });

      color_row.appendChild(color_input);
      container.appendChild(color_row);
    }

    // Helper function to convert color names to hex values
    colorNameToHex(colorName) {
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
  
  
  
    openEYE() {
      this.innerHTML = ``;
      this.scratch_canvas = document.createElement('canvas');
      this.scratch_canvas.addEventListener('click', (e) => {
        if (this.video_polling) {
          this.pauseVideoPoll();
        } else {
          this.beginVideoPoll();
        }
      });
      this.scratch_canvas.width = this.eye_size;
      this.scratch_canvas.height = this.eye_size;
      this.scratch_canvas_context = this.scratch_canvas.getContext('2d', { preserveDrawingBuffer: true });
      // this.appendChild(this.scratch_canvas);
      // 
      this.final_canvas = document.createElement('canvas');
      this.final_canvas.width = this.eye_size;
      this.final_canvas.height = this.eye_size;
      this.final_canvas_context = this.final_canvas.getContext('2d', { preserveDrawingBuffer: true });
      this.appendChild(this.final_canvas);
  
      this.video = document.createElement('video');
      this.video.onloadedmetadata = (e) => {
        this.video.play();
      };
      this.getUserMedia();
  
      this.createMenu();
      this.createFlipButton();
      this.createContrastSlider();
      this.createSaturationSlider();
      this.createBrightnessSlider();
      this.createhueSlider();
      this.createResetButton();
      this.createTakePictureButton();
  
      const details = [...document.querySelectorAll('details')];
      document.addEventListener('click', function(e) {
        if (!details.some(f => f.contains(e.target))) {
          details.forEach(f => f.removeAttribute('open'));
        } else {
          details.forEach(f => !f.contains(e.target) ? f.removeAttribute('open') : '');
        }
      });

      // Create bottom controls container
      this.createBottomControls();
      
      // Create color picker menu
      this.createColorPicker();
    }
  
    async getJpeg() {
      // Convert canvas to Blob and return it
      const image_data = await new Promise(resolve => {
        this.scratch_canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.8);
      });
      return image_data;
    }
  
    async getImageData(){
      const image_data = await this.scratch_canvas.toDataURL('image/png');
      return image_data
    }

    // Export 5 risograph layers as separate PNG files
    async exportRisographLayers() {
      // Get the current dithered image data
      const imageData = this.final_canvas_context.getImageData(0, 0, this.eye_size, this.eye_size);
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;

      // Define the color palette (same as in dithering)
      const palette = [
        [255, 255, 255], // White (paper)
        this.colorToRgb(this.color1),
        this.colorToRgb(this.color2),
        this.colorToRgb(this.color3),
        this.colorToRgb(this.color4),
        this.colorToRgb(this.color5)
      ];

      const colorNames = ['white', this.color1, this.color2, this.color3, this.color4, this.color5];

      // Create 5 layers (skip white/paper layer)
      for (let layerIndex = 1; layerIndex < palette.length; layerIndex++) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width;
        layerCanvas.height = height;
        const layerCtx = layerCanvas.getContext('2d');
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
          if (r === targetColor[0] && g === targetColor[1] && b === targetColor[2]) {
            // This pixel should have ink - make it black
            layerData[i] = 0;     // R
            layerData[i + 1] = 0; // G
            layerData[i + 2] = 0; // B
            layerData[i + 3] = 255; // A (fully opaque)
          } else {
            // This pixel should not have ink - make it white/transparent
            layerData[i] = 255;   // R
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
          const link = document.createElement('a');
          link.href = url;
          link.download = `risograph-layer-${layerIndex}-${colorNames[layerIndex]}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 'image/png');
      }

      console.log('Exported 5 risograph layers:', colorNames.slice(1));
    }
  
    async takePicture(){
      const img = await this.getJpeg();
      this.dispatchEvent(new CustomEvent('NEW PICTURE', {
        detail: img
      }));
    }
  
    async getUserMedia() {
      this.stopVideoStream()
      
      let constraints;
      
      if (this.selected_device && this.selected_device !== '') {
        // Specific device selected
        if (this.selected_device === 'front') {
          // Mobile front camera
          constraints = {
            video: { 
              facingMode: 'user',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
        } else if (this.selected_device === 'back') {
          // Mobile back camera
          constraints = {
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
        } else {
          // Specific device ID
          constraints = {
            video: { 
              deviceId: { exact: this.selected_device },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
        }
      } else {
        // Default camera
        constraints = {
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
      }
      
      try {
        console.log('Requesting camera with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        this.video.volume = 0;
        this.video.play();
        this.beginVideoPoll();
      } catch (error) {
        console.error('Error accessing user media:', error);
        
        // Fallback to basic video constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          this.video.srcObject = fallbackStream;
          this.video.volume = 0;
          this.video.play();
          this.beginVideoPoll();
        } catch (fallbackError) {
          console.error('Fallback camera access also failed:', fallbackError);
        }
      }
    }
  
    async beginVideoPoll() {
      this.video_polling = true;
      this.video_poll = setInterval(() => this.pollVideo(), 250);
    }
  
    pauseVideoPoll() {
      this.video_polling = false;
      clearInterval(this.video_poll);
    }
  
      async pollVideo() {
    // Clear the canvas first
    this.scratch_canvas_context.clearRect(0, 0, this.eye_size, this.eye_size);
    
    // Calculate scaling to maintain aspect ratio
    const videoAspect = this.video.videoWidth / this.video.videoHeight;
    const canvasAspect = 1; // Square canvas
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - fit by height
      drawHeight = this.eye_size;
      drawWidth = drawHeight * videoAspect;
      drawX = (this.eye_size - drawWidth) / 2;
      drawY = 0;
    } else {
      // Video is taller than canvas - fit by width
      drawWidth = this.eye_size;
      drawHeight = drawWidth / videoAspect;
      drawX = 0;
      drawY = (this.eye_size - drawHeight) / 2;
    }
    
    await this.scratch_canvas_context.drawImage(this.video, drawX, drawY, drawWidth, drawHeight);
    this.scratch_canvas_context.filter = `saturate(${this.saturation}%) brightness(${this.brightness}%) contrast(${this.contrast}%) hue-rotate(${this.hue}deg)`
    const img_data = await this.scratch_canvas_context.getImageData(0,0,this.eye_size, this.eye_size);
    
    // Apply dithering
    const dithered_data = this.applyDithering(img_data);
    
    this.final_canvas_context.putImageData(dithered_data, 0, 0);
    this.dispatchEvent(new CustomEvent("IMAGE DRAWN", {
      detail: dithered_data
    }));
  }
  
  
    async initialize(){
      this.openEYE();
    }
  
          // =============================================================================
    // WEB COMPONENT LIFECYCLE METHODS
    // =============================================================================
    
    /**
     * Called when the element is connected to the DOM
     * Initializes all properties from HTML attributes and renders the initial UI
     */
    connectedCallback(){
      // Set initial values from HTML attributes with sensible defaults
      this.contrast = parseInt(this.getAttribute('contrast')) || 100;
      this.saturation = parseInt(this.getAttribute('saturation')) || 100;
      this.brightness = parseInt(this.getAttribute('brightness')) || 100;
      this.hue = parseInt(this.getAttribute('hue')) || 0;
      this.color1 = this.getAttribute('color-1') || 'black';
      this.color2 = this.getAttribute('color-2') || 'orange';
      this.color3 = this.getAttribute('color-3') || 'blue';
      this.color4 = this.getAttribute('color-4') || 'pink';
      this.color5 = this.getAttribute('color-5') || 'red';
      this.dither_method = this.getAttribute('dither-method') || 'floyd-steinberg';
      
      this.render();
    }
  
    stopVideoStream(){
      if (this.video && this.video.srcObject) {
        let tracks = this.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        this.video.srcObject = null;
      }
    }
  
        /**
     * Called when the element is disconnected from the DOM
     * Properly cleans up media streams and polling to prevent memory leaks
     */
    disconnectedCallback(){
      // Stop video polling loop
      this.pauseVideoPoll();
      // Release camera resources
      this.stopVideoStream();
    }

    /**
     * Defines which HTML attributes should trigger attributeChangedCallback
     * @returns {string[]} Array of attribute names to observe
     */
    static get observedAttributes() {
      return ['contrast', 'saturation', 'brightness', 'hue', 'color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'dither-method'];
    }

    /**
     * Called when any observed attribute changes
     * Updates internal properties and syncs UI controls when attributes change
     * 
     * @param {string} name - Name of the changed attribute
     * @param {string} old_value - Previous attribute value
     * @param {string} new_value - New attribute value
     */
    attributeChangedCallback(name, old_value, new_value){
      switch(name){
        case 'contrast':
          this.contrast = parseInt(new_value) || 100;
          if (this.contrast_slider) this.contrast_slider.value = this.contrast;
          break;
        case 'saturation':
          this.saturation = parseInt(new_value) || 100;
          if (this.saturation_slider) this.saturation_slider.value = this.saturation;
          break;
        case 'brightness':
          this.brightness = parseInt(new_value) || 100;
          if (this.brightness_slider) this.brightness_slider.value = this.brightness;
          break;
        case 'hue':
          this.hue = parseInt(new_value) || 0;
          if (this.hue_slider) this.hue_slider.value = this.hue;
          break;
        case 'color-1':
          this.color1 = new_value || 'black';
          break;
        case 'color-2':
          this.color2 = new_value || 'orange';
          break;
        case 'color-3':
          this.color3 = new_value || 'blue';
          break;
        case 'color-4':
          this.color4 = new_value || 'pink';
          break;
        case 'color-5':
          this.color5 = new_value || 'red';
          break;
        case 'dither-method':
          this.dither_method = new_value || 'floyd-steinberg';
          if (this.dither_select) this.dither_select.value = this.dither_method;
          break;
        default:
          // Unhandled attribute - could log warning in debug mode
      }
    }
  }
  
  // =============================================================================
  // COMPONENT REGISTRATION
  // =============================================================================
  
  /**
   * Register the EYE component with the browser's custom element registry
   * This enables usage of <e-y-e> tags in HTML
   * 
   * The tag name 'e-y-e' follows custom element naming conventions:
   * - Must contain a hyphen
   * - Should be descriptive of component function
   * - 'EYE' represents the camera/vision aspect of the component
   */
  customElements.define('e-y-e', EYE);
  
  