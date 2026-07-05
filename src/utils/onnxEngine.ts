import { InferenceSession, Tensor } from 'onnxruntime-react-native';

class OnnxEngine {
  private session: InferenceSession | null = null;
  private readonly modelPath = 'assets/models/yolov12n_quantized.onnx'; // Placeholder asset path for later configuration

  /**
   * Loads the YOLOv12 ONNX model into the device memory
   */
  async loadModel(): Promise<void> {
    try {
      if (this.session) {
        console.log('[ONNX Engine] Model is already loaded.');
        return;
      }

      console.log('[ONNX Engine] Initializing Inference Session for YOLOv12...');
      // Initialize the native session with the model path
      this.session = await InferenceSession.create(this.modelPath);
      console.log('[ONNX Engine] YOLOv12 Model loaded successfully on-device.');
    } catch (error) {
      console.error('[ONNX Engine] Failed to load ONNX model:', error);
    }
  }

  /**
   * Runs inference on a single preprocessed frame tensor
   * @param inputTensor Normalized Float32 array matching [1, 3, 640, 640] input shape
   */
  async runInference(inputTensor: Tensor): Promise<any> {
    if (!this.session) {
      console.warn('[ONNX Engine] Session not initialized. Call loadModel() first.');
      return null;
    }

    try {
      // Prepare the input feeds based on the model's expected input name (usually 'images')
      const feeds: Record<string, Tensor> = {
        images: inputTensor,
      };

      // Execute on-device model inference
      const outputMap = await this.session.run(feeds);
      return outputMap;
    } catch (error) {
      console.error('[ONNX Engine] Inference execution failed:', error);
      return null;
    }
  }
}

export const onnxEngine = new OnnxEngine();
