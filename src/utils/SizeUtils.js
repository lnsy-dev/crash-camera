/**
 * SizeUtils - Utility functions for converting between different size units
 * Handles conversions between pixels, centimeters, and inches for image sizing
 */

/**
 * Convert size value to pixels based on unit and DPI
 * @param {number} value - Size value in the specified unit
 * @param {string} unit - Unit type ('px', 'cm', 'in')
 * @param {number} dpi - Dots per inch for conversion (default 300)
 * @returns {number} Size in pixels
 */
export function convertToPixels(value, unit, dpi = 300) {
  switch (unit) {
    case 'px':
      return Math.round(value);
    case 'cm':
      // 1 inch = 2.54 cm, so 1 cm = dpi/2.54 pixels
      return Math.round(value * (dpi / 2.54));
    case 'in':
      // 1 inch = dpi pixels
      return Math.round(value * dpi);
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Convert pixels to specified unit
 * @param {number} pixels - Size in pixels
 * @param {string} unit - Target unit type ('px', 'cm', 'in')
 * @param {number} dpi - Dots per inch for conversion (default 300)
 * @returns {number} Size in the specified unit
 */
export function convertFromPixels(pixels, unit, dpi = 300) {
  switch (unit) {
    case 'px':
      return pixels;
    case 'cm':
      // pixels / (dpi / 2.54) = cm
      return parseFloat((pixels / (dpi / 2.54)).toFixed(2));
    case 'in':
      // pixels / dpi = inches
      return parseFloat((pixels / dpi).toFixed(2));
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Get the configuration for a specific size unit
 * @param {string} unit - Unit type ('px', 'cm', 'in')
 * @param {Array} sizeUnits - Array of size unit configurations
 * @returns {Object} Unit configuration object
 */
export function getSizeUnitConfig(unit, sizeUnits) {
  return sizeUnits.find(u => u.value === unit);
}

/**
 * Validate size value against unit constraints
 * @param {number} value - Size value to validate
 * @param {string} unit - Unit type
 * @param {Array} sizeUnits - Array of size unit configurations
 * @returns {boolean} Whether the value is valid for the unit
 */
export function validateSizeValue(value, unit, sizeUnits) {
  const config = getSizeUnitConfig(unit, sizeUnits);
  if (!config) return false;

  return value >= config.min && value <= config.max;
}

/**
 * Clamp size value to unit constraints
 * @param {number} value - Size value to clamp
 * @param {string} unit - Unit type
 * @param {Array} sizeUnits - Array of size unit configurations
 * @returns {number} Clamped value
 */
export function clampSizeValue(value, unit, sizeUnits) {
  const config = getSizeUnitConfig(unit, sizeUnits);
  if (!config) return value;

  return Math.max(config.min, Math.min(config.max, value));
}

/**
 * Format size value for display
 * @param {number} value - Size value
 * @param {string} unit - Unit type
 * @returns {string} Formatted display string
 */
export function formatSizeDisplay(value, unit) {
  const unitLabels = {
    'px': 'px',
    'cm': 'cm',
    'in': 'in'
  };

  const precision = unit === 'px' ? 0 : 1;
  return `${value.toFixed(precision)} ${unitLabels[unit]}`;
}
