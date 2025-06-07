
class EYE extends HTMLElement {
    video_polling = false;
    flipped = false;
    eye_size = 768;
    contrast = 100;
    saturation = 100; 
    brightness = 100;
    hue = 0;
    selected_device = null;
    color1 = 'black';
    color2 = 'orange'; 
    color3 = 'blue';
    color4 = 'pink';
    
    render() {
      const initialize_button = document.createElement('button');
      initialize_button.classList.add('initialize-button')
      initialize_button.innerText = 'Connect';
      initialize_button.addEventListener('click', (e) => {
        this.openEYE();
      });
      this.appendChild(initialize_button);
    }
  
    drawLine(startX, startY, endX, endY, lineWidth = 1, strokeStyle = 'red'){
      const ctx = this.final_canvas_context;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }

    // Convert color name or hex to RGB
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

    // Calculate color distance using Euclidean distance
    colorDistance(rgb1, rgb2) {
      return Math.sqrt(
        Math.pow(rgb1[0] - rgb2[0], 2) +
        Math.pow(rgb1[1] - rgb2[1], 2) +
        Math.pow(rgb1[2] - rgb2[2], 2)
      );
    }

    // Find closest color from palette
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

    // Apply Floyd-Steinberg dithering
    applyDithering(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      // Convert color palette to RGB (always include white)
      const palette = [
        [255, 255, 255], // White
        this.colorToRgb(this.color1),
        this.colorToRgb(this.color2),
        this.colorToRgb(this.color3),
        this.colorToRgb(this.color4)
      ];

      console.log('Dithering with palette:', {
        white: 'white',
        color1: this.color1,
        color2: this.color2,
        color3: this.color3,
        color4: this.color4,
        rgbPalette: palette
      });

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const oldPixel = [data[idx], data[idx + 1], data[idx + 2]];
          const newPixel = this.findClosestColor(oldPixel, palette);
          
          // Set new pixel color
          data[idx] = newPixel[0];     // R
          data[idx + 1] = newPixel[1]; // G
          data[idx + 2] = newPixel[2]; // B
          // Alpha stays the same
          
          // Calculate error
          const errorR = oldPixel[0] - newPixel[0];
          const errorG = oldPixel[1] - newPixel[1];  
          const errorB = oldPixel[2] - newPixel[2];
          
          // Distribute error to neighboring pixels (Floyd-Steinberg)
          const distributeError = (x2, y2, factor) => {
            if (x2 >= 0 && x2 < width && y2 >= 0 && y2 < height) {
              const idx2 = (y2 * width + x2) * 4;
              data[idx2] = Math.max(0, Math.min(255, data[idx2] + errorR * factor));
              data[idx2 + 1] = Math.max(0, Math.min(255, data[idx2 + 1] + errorG * factor));
              data[idx2 + 2] = Math.max(0, Math.min(255, data[idx2 + 2] + errorB * factor));
            }
          };
          
          distributeError(x + 1, y, 7/16);     // Right
          distributeError(x - 1, y + 1, 3/16); // Bottom-left
          distributeError(x, y + 1, 5/16);     // Bottom
          distributeError(x + 1, y + 1, 1/16); // Bottom-right
        }
      }
      
      return imageData;
    }
  
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
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 1000;
      `;

      // Camera select dropdown
      this.createBottomDeviceDropdown(bottom_container);
      
      // Export layers button
      this.createBottomExportButton(bottom_container);

      this.appendChild(bottom_container);
    }

    async createBottomDeviceDropdown(container){
      const connected_devices = [...await navigator.mediaDevices.enumerateDevices()].filter(d => d.kind === 'videoinput');
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
      
      for (let device_index in connected_devices) {
        const device = connected_devices[device_index];
        const option = document.createElement('option');
        option.setAttribute('value', device.deviceId);
        option.innerText = device.label || `Camera ${parseInt(device_index) + 1}`;
        video_inputs.appendChild(option);
      }
      video_inputs.addEventListener('change', (e) => {
        this.selected_device = e.target.value;
        console.log(this.selected_device);
        this.getUserMedia();
      });
      
      selection_wrapper.appendChild(selection_label);
      selection_wrapper.appendChild(video_inputs);
      container.appendChild(selection_wrapper);
    }

    createBottomExportButton(container){
      const export_button = document.createElement('button');
      export_button.classList.add('export-layers-button');
      export_button.innerText = 'Export Risograph Layers';
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

    // Export 4 risograph layers as separate PNG files
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
        this.colorToRgb(this.color4)
      ];

      const colorNames = ['white', this.color1, this.color2, this.color3, this.color4];

      // Create 4 layers (skip white/paper layer)
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

      console.log('Exported 4 risograph layers:', colorNames.slice(1));
    }
  
    async takePicture(){
      const img = await this.getJpeg();
      this.dispatchEvent(new CustomEvent('NEW PICTURE', {
        detail: img
      }));
    }
  
    async getUserMedia() {
      this.stopVideoStream()
      const constraints = {
        video: { deviceId: this.selected_device, 
          width: this.eye_size,
          height: this.eye_size 
        }
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        this.video.volume = 0;
        this.video.play();
        this.beginVideoPoll();
      } catch (error) {
        console.error('Error accessing user media:', error);
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
    await this.scratch_canvas_context.drawImage(this.video, 0, 0, this.eye_size, this.eye_size);
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
  
      connectedCallback(){
    // Set initial values from attributes
    this.contrast = parseInt(this.getAttribute('contrast')) || 100;
    this.saturation = parseInt(this.getAttribute('saturation')) || 100;
    this.brightness = parseInt(this.getAttribute('brightness')) || 100;
    this.hue = parseInt(this.getAttribute('hue')) || 0;
    this.color1 = this.getAttribute('color-1') || 'black';
    this.color2 = this.getAttribute('color-2') || 'orange';
    this.color3 = this.getAttribute('color-3') || 'blue';
    this.color4 = this.getAttribute('color-4') || 'pink';
    
    this.render();
  }
  
    stopVideoStream(){
      if (this.video && this.video.srcObject) {
        let tracks = this.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        this.video.srcObject = null;
      }
    }
  
    disconnectedCallback(){
      // Stop video polling
      this.pauseVideoPoll();
      // Stop the media tracks
      this.stopVideoStream();
    }
  
      static get observedAttributes() {
    return ['contrast', 'saturation', 'brightness', 'hue', 'color-1', 'color-2', 'color-3', 'color-4'];
  }

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
      default:
    }
  }
  }
  
  customElements.define('e-y-e', EYE);
  
  