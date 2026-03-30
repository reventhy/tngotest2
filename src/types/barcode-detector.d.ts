type BarcodeFormat = "qr_code";

interface DetectedBarcode {
  rawValue?: string;
  boundingBox?: DOMRectReadOnly;
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: BarcodeFormat[] }): BarcodeDetector;
  getSupportedFormats?: () => Promise<BarcodeFormat[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export {};
