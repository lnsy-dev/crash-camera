# Image Upload Feature

## Overview

The crash-camera application now includes an image upload feature that allows users to upload static images for color separation processing instead of using live camera input. This feature pauses all image gathering from the camera and processes the uploaded image with the same color separation and dithering algorithms.

## How It Works

### User Interface

1. **Upload Image Button**: Located in the bottom controls menu, this button allows users to select and upload an image file
2. **Close Uploaded Image Button**: Appears when an image is uploaded, allowing users to return to camera mode

### Functionality

When an image is uploaded:
- Camera polling is automatically paused
- The uploaded image is scaled to fit the canvas while maintaining aspect ratio
- All image processing controls (contrast, saturation, brightness, hue, colors, dithering) work in real-time on the uploaded image
- The "Upload Image" button is hidden and replaced with "Close Uploaded Image"

When closing the uploaded image:
- Camera polling resumes
- The interface returns to standard camera functionality
- Button visibility is restored to normal state

### Technical Implementation

#### New Components Added

**Constants (`src/utils/Constants.js`)**:
- `uploadButton`: CSS class for upload button
- `closeUploadButton`: CSS class for close button

**UIManager (`src/ui/UIManager.js`)**:
- `createUploadImageButton()`: Creates the upload button and hidden file input
- `createCloseUploadButton()`: Creates the close button (initially hidden)
- `toggleUploadButtons()`: Manages button visibility based on upload state

**Main EYE Component (`index.js`)**:
- `uploadedImage`: Stores the uploaded image canvas
- `isImageUploaded`: Boolean state tracking upload status
- `handleImageUpload()`: Processes file upload and creates image canvas
- `processUploadedImage()`: Applies filters and dithering to uploaded image
- `closeUploadedImage()`: Returns to camera mode

#### State Management

The component tracks upload state with two main properties:
- `uploadedImage`: Canvas element containing the uploaded image
- `isImageUploaded`: Boolean flag indicating current mode

#### Image Processing Pipeline

1. **File Upload**: User selects image file via file input
2. **Canvas Creation**: Image is loaded and drawn to a canvas scaled to fit the eye dimensions
3. **Filter Application**: CSS filters (contrast, saturation, brightness, hue) are applied during canvas operations
4. **Dithering**: The same color separation and dithering algorithms used for camera input are applied
5. **Real-time Updates**: Any changes to controls immediately reprocess the uploaded image

#### File Support

- Accepts all standard image formats (JPEG, PNG, GIF, WebP, etc.)
- Files are processed client-side with no server upload required
- File input is cleared after processing to allow re-upload of the same file

### CSS Styling

**Upload Button** (`.upload-image-button`):
- Styled to match the existing control theme
- Hover effects for user feedback

**Close Button** (`.close-upload-button`):
- Red background to indicate "close" action
- Initially hidden, shown only when image is uploaded

### Integration Points

The upload feature integrates seamlessly with existing functionality:

- **Image Adjustment Sliders**: All sliders work in real-time on uploaded images
- **Color Palette**: Color changes are immediately applied to uploaded images
- **Dithering Methods**: All dithering algorithms work with uploaded images
- **Export Functions**: Export capabilities work with processed uploaded images
- **Attribute System**: HTML attribute changes trigger reprocessing of uploaded images

### Usage Example

```html
<e-y-e
    contrast="150"
    saturation="200"
    brightness="120"
    hue="45"
    color-1="#000000"
    color-2="#ff6c2f"
    color-3="#235ba8"
    color-4="#ff48b0"
    color-5="#f7ff00"
    width-value="7.5"
    height-value="7.5"
    size-unit="cm"
></e-y-e>
```

1. Click "Connect" to initialize the component
2. Click "Upload Image" in the bottom controls
3. Select an image file from your device
4. The camera feed pauses and your image is processed
5. Adjust any controls to see real-time changes
6. Click "Close Uploaded Image" to return to camera mode

### Error Handling

- Invalid files are handled gracefully with console error logging
- Failed image loads are caught and reported
- State is properly managed to prevent inconsistent UI states

### Performance Considerations

- Images are processed client-side with no server dependency
- Canvas operations are optimized for real-time adjustment
- Memory is managed by clearing file inputs and properly disposing of image resources

This feature maintains the real-time, interactive nature of the color separation tool while extending its capabilities to work with static images, making it useful for both live camera work and post-processing of existing images.