/**
 * CameraManager - Handles camera access, device enumeration, and video streaming
 * Manages getUserMedia API interactions and device switching functionality
 */

import { DEFAULT_VALUES } from '../utils/Constants.js';

export class CameraManager {
  constructor() {
    this.selectedDevice = null;
    this.video = null;
    this.stream = null;
    this.onStreamReady = null;
  }

  /**
   * Initialize the video element and set up event handlers
   * @param {Function} onStreamReady - Callback when video stream is ready
   */
  initialize(onStreamReady) {
    this.onStreamReady = onStreamReady;
    this.video = document.createElement('video');
    this.video.volume = 0;

    this.video.onloadedmetadata = () => {
      this.video.play();
      if (this.onStreamReady) {
        this.onStreamReady();
      }
    };
  }

  /**
   * Get available video input devices
   * @returns {Promise<MediaDeviceInfo[]>} Array of video input devices
   */
  async getAvailableDevices() {
    try {
      // First, request permissions to get full device info
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately, we just needed permission
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with proper labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      console.log('Available video devices:', videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Error getting camera permissions or enumerating devices:', error);
      // Return fallback device options for mobile
      return [
        { deviceId: '', label: 'Default Camera' },
        { deviceId: 'front', label: 'Front Camera' },
        { deviceId: 'back', label: 'Back Camera' }
      ];
    }
  }

  /**
   * Set the selected camera device
   * @param {string} deviceId - Device ID to select
   */
  setSelectedDevice(deviceId) {
    this.selectedDevice = deviceId;
    console.log('Selected camera device:', this.selectedDevice);
  }

  /**
   * Get the current video element
   * @returns {HTMLVideoElement} Video element
   */
  getVideoElement() {
    return this.video;
  }

  /**
   * Start camera stream with the selected device
   * @returns {Promise<void>}
   */
  async startStream() {
    this.stopStream();

    let constraints = this._buildConstraints();

    try {
      console.log('Requesting camera with constraints:', constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.play();
    } catch (error) {
      console.error('Error accessing user media:', error);

      // Fallback to basic video constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.stream = fallbackStream;
        this.video.srcObject = fallbackStream;
        this.video.play();
      } catch (fallbackError) {
        console.error('Fallback camera access also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Stop the current video stream
   */
  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video && this.video.srcObject) {
      this.video.srcObject = null;
    }
  }

  /**
   * Check if camera is currently streaming
   * @returns {boolean} True if streaming
   */
  isStreaming() {
    return this.stream && this.stream.active;
  }

  /**
   * Get video dimensions
   * @returns {Object} Object with width and height properties
   */
  getVideoDimensions() {
    if (!this.video) {
      return { width: 0, height: 0 };
    }
    return {
      width: this.video.videoWidth,
      height: this.video.videoHeight
    };
  }

  /**
   * Build camera constraints based on selected device
   * @returns {Object} MediaTrackConstraints object
   * @private
   */
  _buildConstraints() {
    const baseConstraints = {
      width: { ideal: DEFAULT_VALUES.VIDEO_WIDTH },
      height: { ideal: DEFAULT_VALUES.VIDEO_HEIGHT }
    };

    if (!this.selectedDevice || this.selectedDevice === '') {
      // Default camera
      return { video: baseConstraints };
    }

    if (this.selectedDevice === 'front') {
      // Mobile front camera
      return {
        video: {
          ...baseConstraints,
          facingMode: 'user'
        }
      };
    }

    if (this.selectedDevice === 'back') {
      // Mobile back camera
      return {
        video: {
          ...baseConstraints,
          facingMode: 'environment'
        }
      };
    }

    // Specific device ID
    return {
      video: {
        ...baseConstraints,
        deviceId: { exact: this.selectedDevice }
      }
    };
  }

  /**
   * Create a friendly device name for display
   * @param {MediaDeviceInfo} device - Device info object
   * @param {number} index - Device index for fallback naming
   * @returns {string} Friendly device name
   */
  static createDeviceName(device, index) {
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

    return deviceName;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopStream();
    this.video = null;
    this.onStreamReady = null;
  }
}
