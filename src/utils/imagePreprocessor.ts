import { Tensor } from 'onnxruntime-react-native';

export const imagePreprocessor = {
  /**
   * Converts raw frame pixel data into a normalized Float32 Tensor [1, 3, 640, 640]
   * @param rgbBuffer Raw byte array of the frame image
   * @param width Original frame width
   * @param height Original frame height
   */
  transformFrameToTensor(rgbBuffer: Uint8Array, width: number, height: number): Tensor {
    const targetSize = 640;
    const floatData = new Float32Array(1 * 3 * targetSize * targetSize);

    // Simple bilinear resize and normalization loop (mock implementation for framework pipeline)
    // In production, this runs via native frame processors or turbo modules for 60 FPS
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        // Map target 640x640 coordinates back to original frame coordinates
        const origX = Math.floor((x / targetSize) * width);
        const origY = Math.floor((y / targetSize) * height);
        const origOffset = (origY * width + origX) * 3; // Assuming RGB 24-bit packing

        // YOLO expects planar format: RRRR...GGGG...BBBB... instead of interleaved RGBRGBRGB...
        const rIndex = y * targetSize + x;
        const gIndex = rIndex + targetSize * targetSize;
        const bIndex = gIndex + targetSize * targetSize;

        // Normalize pixels to [0, 1]
        floatData[rIndex] = (rgbBuffer[origOffset] || 0) / 255.0;
        floatData[gIndex] = (rgbBuffer[origOffset + 1] || 0) / 255.0;
        floatData[bIndex] = (rgbBuffer[origOffset + 2] || 0) / 255.0;
      }
    }

    // Create the ONNX Runtime Tensor
    return new Tensor('float32', floatData, [1, 3, targetSize, targetSize]);
  },
};
