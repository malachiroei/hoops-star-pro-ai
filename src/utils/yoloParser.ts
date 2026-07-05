export interface PredictionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  classLabel: 'ball' | 'rim' | 'player';
}

export const yoloParser = {
  /**
   * Parses raw ONNX inference outputs into structured bounding boxes
   */
  parseOutputs(outputMap: any, confidenceThreshold = 0.5): PredictionBox[] {
    const boxes: PredictionBox[] = [];

    // Safety guard to ensure output exists
    if (!outputMap || !outputMap.output0) return boxes;

    const rawData = outputMap.output0.data as Float32Array;
    // YOLOv12 standard output shape is typically [1, num_anchors, 84] or similar depending on the exact export
    // For our structural pipeline, we mock the row parsing logic:
    const numRows = rawData.length / 85; // 4 box coordinates + 1 objectness + 80 classes

    for (let i = 0; i < numRows; i++) {
      const offset = i * 85;
      const confidence = rawData[offset + 4];

      if (confidence > confidenceThreshold) {
        // Map class index to our core labels
        // Index 0: ball, Index 1: rim, Index 2: player (Standard Custom Hoop Dataset mapping)
        let classLabel: 'ball' | 'rim' | 'player' = 'player';
        const classScore0 = rawData[offset + 5];
        const classScore1 = rawData[offset + 6];
        const classScore2 = rawData[offset + 7];

        const maxScore = Math.max(classScore0, classScore1, classScore2);
        if (maxScore === classScore0) classLabel = 'ball';
        else if (maxScore === classScore1) classLabel = 'rim';

        boxes.push({
          x: rawData[offset + 0],
          y: rawData[offset + 1],
          width: rawData[offset + 2],
          height: rawData[offset + 3],
          confidence: confidence,
          classLabel: classLabel,
        });
      }
    }

    // Apply basic Non-Maximum Suppression (NMS) to clear duplicates
    return this.applyNMS(boxes, 0.45);
  },

  /**
   * Simple Intersection over Union (IoU) based NMS
   */
  applyNMS(boxes: PredictionBox[], iouThreshold: number): PredictionBox[] {
    const sortedBoxes = [...boxes].sort((a, b) => b.confidence - a.confidence);
    const keep: PredictionBox[] = [];

    while (sortedBoxes.length > 0) {
      const current = sortedBoxes.shift()!;
      keep.push(current);

      for (let i = sortedBoxes.length - 1; i >= 0; i--) {
        if (current.classLabel === sortedBoxes[i].classLabel) {
          const iou = this.calculateIoU(current, sortedBoxes[i]);
          if (iou > iouThreshold) {
            sortedBoxes.splice(i, 1);
          }
        }
      }
    }

    return keep;
  },

  calculateIoU(boxA: PredictionBox, boxB: PredictionBox): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;

    return interArea / (boxAArea + boxBArea - interArea);
  },
};
