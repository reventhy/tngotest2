"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import styles from "./object-tracking-demo.module.css";
import {
  DEMO_VEHICLES,
  findVehicleByQr,
  getPrimaryVehicle,
  type DemoVehicle,
  type UnlockResponse,
  type VehiclesResponse,
} from "@/lib/demo-data";

type DemoStage =
  | "tracking"
  | "locateQr"
  | "scanQr"
  | "confirm"
  | "physicalUnlock"
  | "success"
  | "support"
  | "unavailable";
type PermissionState = "idle" | "loading" | "granted" | "denied" | "unsupported";
type ModelState = "idle" | "loading" | "ready" | "error";
type UnlockState = "idle" | "loading";
type SupportMode = "lockStuck" | "unlockError";

type Prediction = {
  bbox: [number, number, number, number] | number[];
  class: string;
  score: number;
};

type DetectionModel = {
  detect(input: HTMLVideoElement): Promise<Prediction[]>;
};

type BrowserBarcode = {
  rawValue?: string;
};

type BrowserBarcodeDetector = {
  detect(image: ImageBitmapSource): Promise<BrowserBarcode[]>;
};

type BrowserWindowWithBarcodeDetector = Window & {
  BarcodeDetector?: new (options?: { formats?: string[] }) => BrowserBarcodeDetector;
};

type OverlayDetection = {
  id: string;
  label: string;
  distanceLabel: string;
  sourceClass: string;
  left: number;
  top: number;
  width: number;
  height: number;
  areaRatio: number;
  centerX: number;
  centerY: number;
  highlight: boolean;
};

const TOP_BAR_TITLES: Record<DemoStage, string> = {
  tracking: "Quét để tìm xe gần nhất",
  locateQr: "Tìm tem QR trên xe",
  scanQr: "Quét đúng mã QR",
  confirm: "Xác nhận xe và mở khóa",
  physicalUnlock: "Mở khóa xe vật lý",
  success: "Xe đã sẵn sàng",
  support: "Không mở được khóa?",
  unavailable: "Xe không khả dụng",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function estimateDistance(areaRatio: number, index: number) {
  const rawDistance = 9 - areaRatio * 34 - index * 0.8;
  return clamp(rawDistance, 1.7, 8.5);
}

function formatMeters(areaRatio: number, index: number) {
  const distance = estimateDistance(areaRatio, index);
  return `${distance.toFixed(distance < 3 ? 1 : 0)}m`;
}

function getDirectionCopy(primary: OverlayDetection | null) {
  if (!primary) {
    return "Hướng camera ra chỗ có xe đạp để bắt đầu theo dõi.";
  }

  if (primary.areaRatio < 0.065) {
    return `Đi thẳng ${primary.distanceLabel}`;
  }

  if (primary.centerX < 0.42) {
    return "Xe đang lệch trái, xoay camera sang phải.";
  }

  if (primary.centerX > 0.58) {
    return "Xe đang lệch phải, xoay camera sang trái.";
  }

  if (primary.centerY < 0.36) {
    return "Hạ camera xuống một chút để bắt đúng xe.";
  }

  if (primary.centerY > 0.7) {
    return "Nâng camera lên để căn chỉnh khung hình.";
  }

  return `Giữ khung hình ổn định, còn khoảng ${primary.distanceLabel}`;
}

function getTrackingLabel(index: number, sourceClass: string) {
  if (index === 0) {
    return "Xe gần nhất";
  }

  if (sourceClass === "motorcycle") {
    return "Xe trợ lực";
  }

  return "Xe đạp khác";
}

function buildOverlayDetections(predictions: Prediction[], video: HTMLVideoElement) {
  const relevant = predictions
    .filter(
      (prediction) =>
        (prediction.class === "bicycle" || prediction.class === "motorcycle") &&
        prediction.score >= 0.45,
    )
    .sort(
      (left, right) =>
        right.bbox[2] * right.bbox[3] - left.bbox[2] * left.bbox[3],
    )
    .slice(0, 3);

  return relevant.map((prediction, index) => {
    const [x, y, width, height] = prediction.bbox;
    const areaRatio = (width * height) / (video.videoWidth * video.videoHeight);

    return {
      id: `${prediction.class}-${index}`,
      label: getTrackingLabel(index, prediction.class),
      distanceLabel: formatMeters(areaRatio, index),
      sourceClass: prediction.class,
      left: (x / video.videoWidth) * 100,
      top: (y / video.videoHeight) * 100,
      width: (width / video.videoWidth) * 100,
      height: (height / video.videoHeight) * 100,
      areaRatio,
      centerX: (x + width / 2) / video.videoWidth,
      centerY: (y + height / 2) / video.videoHeight,
      highlight: index === 0,
    } satisfies OverlayDetection;
  });
}

function getSupportContent(mode: SupportMode) {
  if (mode === "unlockError") {
    return {
      hud: "CẦN THỬ LẠI",
      pill: "Chưa gửi được lệnh mở khóa",
      title: "Không thể gửi lệnh mở khóa",
      cardTitle: "Thử lại khi mạng ổn định",
      body:
        "Kiểm tra kết nối rồi thử gửi lại lệnh mở khóa. Nếu vẫn lỗi, quay lại chọn xe khác hoặc báo sự cố.",
      primaryLabel: "Thử gửi lại lệnh",
      secondaryLabel: "Báo sự cố / đổi xe khác",
    };
  }

  return {
    hud: "CẦN HỖ TRỢ",
    pill: "Khóa chưa nhả sau khi đã gửi lệnh",
    title: "Xử lý khi khóa chưa mở",
    cardTitle: "Thử lại tại cụm khóa vật lý",
    body:
      "Giữ xe đứng yên, thử gạt lại chốt một lần nữa. Nếu vẫn kẹt, đổi sang xe khác hoặc báo sự cố để đội vận hành hỗ trợ.",
    primaryLabel: "Thử lại mở khóa",
    secondaryLabel: "Báo sự cố / đổi xe khác",
  };
}

export default function ObjectTrackingDemo() {
  const router = useRouter();

  const [stage, setStage] = useState<DemoStage>("tracking");
  const [stageHistory, setStageHistory] = useState<DemoStage[]>([]);
  const [vehicles, setVehicles] = useState<DemoVehicle[]>(DEMO_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<DemoVehicle | null>(
    getPrimaryVehicle(DEMO_VEHICLES),
  );
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [cameraMessage, setCameraMessage] = useState(
    "Bật camera sau để bắt đầu flow hướng dẫn thuê xe TNGo.",
  );
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [detections, setDetections] = useState<OverlayDetection[]>([]);
  const [directionCopy, setDirectionCopy] = useState(
    "Hướng camera ra chỗ có xe đạp để bắt đầu theo dõi.",
  );
  const [qrMessage, setQrMessage] = useState("Giữ điện thoại song song với tem QR.");
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [unlockState, setUnlockState] = useState<UnlockState>("idle");
  const [supportMode, setSupportMode] = useState<SupportMode>("lockStuck");
  const [manualCodeOpen, setManualCodeOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<DetectionModel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrDetectorRef = useRef<BrowserBarcodeDetector | null>(null);
  const trackingBusyRef = useRef(false);
  const qrBusyRef = useRef(false);
  const qrLockRef = useRef(false);

  const activeVehicle = selectedVehicle ?? getPrimaryVehicle(vehicles);
  const usesLiveCamera = stage === "tracking" || stage === "scanQr";
  const supportContent = getSupportContent(supportMode);

  useEffect(() => {
    let active = true;

    async function loadVehicles() {
      try {
        const response = await fetch("/api/vehicles");
        const payload = (await response.json()) as VehiclesResponse;

        if (!active) {
          return;
        }

        setVehicles(payload.vehicles);
        setSelectedVehicle(getPrimaryVehicle(payload.vehicles));
      } catch {
        if (!active) {
          return;
        }

        setVehicles(DEMO_VEHICLES);
        setSelectedVehicle(getPrimaryVehicle(DEMO_VEHICLES));
      }
    }

    void loadVehicles();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadModel() {
      setModelState("loading");

      try {
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-converter");
        await import("@tensorflow/tfjs-backend-webgl");
        await import("@tensorflow/tfjs-backend-cpu");

        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }

        await tf.ready();

        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });

        if (!active) {
          return;
        }

        modelRef.current = model as unknown as DetectionModel;
        setModelState("ready");
      } catch {
        if (active) {
          setModelState("error");
        }
      }
    }

    void loadModel();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (stage !== "scanQr") {
      qrLockRef.current = false;
      setManualCodeOpen(false);
      setManualCode("");
    }

    if (stage === "tracking") {
      setUnlockState("idle");
      setInsuranceEnabled(false);
      setSupportMode("lockStuck");
    }
  }, [stage]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setCameraMessage("Trình duyệt này không hỗ trợ truy cập camera.");
      return false;
    }

    setPermissionState("loading");
    setCameraMessage("Đang khởi động camera sau...");

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element chưa sẵn sàng.");
      }

      streamRef.current = stream;
      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }

        video.onloadedmetadata = () => resolve();
      });

      await video.play();

      setPermissionState("granted");
      setCameraMessage("Camera đang hoạt động.");
      return true;
    } catch {
      setPermissionState("denied");
      setCameraMessage("Không bật được camera. Hãy cấp quyền rồi thử lại.");
      return false;
    }
  }

  function goToStage(nextStage: DemoStage) {
    if (nextStage === stage) {
      return;
    }

    setStageHistory((currentHistory) => [...currentHistory, stage]);
    setStage(nextStage);
  }

  function resetToTracking() {
    setStageHistory([]);
    setStage("tracking");
    setUnlockState("idle");
    setSupportMode("lockStuck");
    setInsuranceEnabled(false);
    setQrMessage("Giữ điện thoại song song với tem QR.");
    setSelectedVehicle(getPrimaryVehicle(vehicles));
  }

  function handleBack() {
    setManualCodeOpen(false);

    if (stageHistory.length === 0) {
      router.push("/");
      return;
    }

    const previousStage = stageHistory[stageHistory.length - 1];
    setStageHistory((currentHistory) => currentHistory.slice(0, -1));
    setStage(previousStage);
  }

  async function resolveQrCode(rawValue: string) {
    if (qrLockRef.current) {
      return;
    }

    qrLockRef.current = true;
    const matchedVehicle = findVehicleByQr(vehicles, rawValue);

    if (!matchedVehicle) {
      setQrMessage(
        `Đã đọc mã "${rawValue}" nhưng chưa có trong inventory demo. Hãy thử QR khác hoặc nhập mã xe.`,
      );

      window.setTimeout(() => {
        qrLockRef.current = false;
      }, 1200);
      return;
    }

    setSelectedVehicle(matchedVehicle);
    setQrMessage(`Đã nhận diện ${matchedVehicle.id}. Đang chuyển bước...`);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });

    startTransition(() => {
      goToStage(matchedVehicle.status === "available" ? "confirm" : "unavailable");
    });
  }

  const runTrackingStep = useEffectEvent(async () => {
    if (
      trackingBusyRef.current ||
      stage !== "tracking" ||
      permissionState !== "granted" ||
      modelState !== "ready"
    ) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || !modelRef.current) {
      return;
    }

    trackingBusyRef.current = true;

    try {
      const predictions = await modelRef.current.detect(video);
      const overlay = buildOverlayDetections(predictions, video);
      const primary = overlay[0] ?? null;

      startTransition(() => {
        setDetections(overlay);
        setDirectionCopy(getDirectionCopy(primary));
      });
    } catch {
      setDirectionCopy("Model nhận diện tạm thời không phân tích được khung hình này.");
    } finally {
      trackingBusyRef.current = false;
    }
  });

  const runQrStep = useEffectEvent(async () => {
    if (
      qrBusyRef.current ||
      stage !== "scanQr" ||
      permissionState !== "granted" ||
      qrLockRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = qrCanvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      return;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    qrBusyRef.current = true;

    try {
      const width = 640;
      const height = Math.max(360, Math.floor((video.videoHeight / video.videoWidth) * width));

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      const browserWindow = window as BrowserWindowWithBarcodeDetector;

      if (!qrDetectorRef.current && browserWindow.BarcodeDetector) {
        qrDetectorRef.current = new browserWindow.BarcodeDetector({
          formats: ["qr_code"],
        });
      }

      if (qrDetectorRef.current) {
        const barcodes = await qrDetectorRef.current.detect(canvas);
        const rawValue = barcodes[0]?.rawValue;

        if (rawValue) {
          await resolveQrCode(rawValue);
          return;
        }
      }

      const imageData = context.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: "attemptBoth",
      });

      if (code?.data) {
        await resolveQrCode(code.data);
        return;
      }

      setQrMessage("Giữ điện thoại song song và đưa camera gần hơn với tem QR.");
    } finally {
      qrBusyRef.current = false;
    }
  });

  useEffect(() => {
    if (
      stage !== "tracking" ||
      permissionState !== "granted" ||
      modelState !== "ready"
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      void runTrackingStep();
    }, 900);

    void runTrackingStep();

    return () => {
      window.clearInterval(timer);
    };
  }, [modelState, permissionState, stage]);

  useEffect(() => {
    if (stage !== "scanQr" || permissionState !== "granted") {
      return;
    }

    const timer = window.setInterval(() => {
      void runQrStep();
    }, 350);

    return () => {
      window.clearInterval(timer);
    };
  }, [permissionState, stage]);

  async function handleTrackingPrimaryAction() {
    if (permissionState !== "granted") {
      const ready = await startCamera();
      if (!ready) {
        return;
      }
    }

    goToStage("locateQr");
  }

  async function handleLocateQrPrimaryAction() {
    if (permissionState !== "granted") {
      await startCamera();
    }

    setQrMessage("Giữ điện thoại song song với tem QR.");
    goToStage("scanQr");
  }

  async function handleScanPrimaryAction() {
    if (permissionState !== "granted") {
      await startCamera();
      return;
    }

    setQrMessage("Đang tìm QR trong khung hình...");
  }

  async function handleUnlockVehicle() {
    if (!activeVehicle) {
      return;
    }

    setUnlockState("loading");

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: activeVehicle.id,
          insuranceEnabled,
        }),
      });

      const payload = (await response.json()) as UnlockResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể mở khóa xe.");
      }

      setUnlockState("idle");
      goToStage("physicalUnlock");
    } catch {
      setUnlockState("idle");
      setSupportMode("unlockError");
      goToStage("support");
    }
  }

  function handleSupportPrimaryAction() {
    if (supportMode === "unlockError") {
      setSupportMode("lockStuck");
      setStage("confirm");
      setStageHistory((currentHistory) => currentHistory.slice(0, -1));
      return;
    }

    setStage("physicalUnlock");
    setStageHistory((currentHistory) => currentHistory.slice(0, -1));
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualCode.trim()) {
      return;
    }

    await resolveQrCode(manualCode.trim());
    setManualCodeOpen(false);
  }

  return (
    <main className={styles.page}>
      <section className={styles.phoneStage}>
        <div className={styles.phone}>
          <header className={styles.topBar}>
            <button
              aria-label="Quay lại bước trước"
              className={styles.backButton}
              onClick={handleBack}
              type="button"
            >
              ‹
            </button>
            <h2>{TOP_BAR_TITLES[stage]}</h2>
            <div aria-hidden="true" className={styles.topBarSpacer} />
          </header>

          <div
            className={`${styles.cameraView} ${
              stage === "success"
                ? styles.cameraViewSuccess
                : stage === "support"
                  ? styles.cameraViewWarning
                  : styles.cameraViewNeutral
            }`}
          >
            {usesLiveCamera && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  className={styles.cameraFeed}
                  muted
                  playsInline
                />
                <div
                  className={`${styles.cameraTint} ${
                    stage === "tracking" || stage === "scanQr"
                      ? styles.cameraTintLight
                      : styles.cameraTintDefault
                  }`}
                />
              </>
            )}

            {usesLiveCamera && permissionState !== "granted" && (
              <div className={styles.cameraFallback}>
                <p className={styles.cameraFallbackTitle}>Camera chưa sẵn sàng</p>
                <p className={styles.cameraFallbackBody}>{cameraMessage}</p>
                <button
                  className={styles.inlineAction}
                  onClick={() => void startCamera()}
                  type="button"
                >
                  Bật camera
                </button>
              </div>
            )}

            {stage === "tracking" && permissionState === "granted" && (
              <>
                <div className={styles.liveChip}>LIVE TRACKING / YOLO</div>
                <div className={styles.focusTarget} aria-hidden="true">
                  <span className={styles.focusCrossHorizontal} />
                  <span className={styles.focusCrossVertical} />
                </div>

                {detections.map((detection) => (
                  <div
                    key={detection.id}
                    className={`${styles.detectionBox} ${
                      detection.highlight ? styles.detectionPrimary : styles.detectionSecondary
                    }`}
                    style={{
                      left: `${detection.left}%`,
                      top: `${detection.top}%`,
                      width: `${detection.width}%`,
                      height: `${detection.height}%`,
                    }}
                  >
                    <span className={styles.detectionTag}>
                      {detection.label} • {detection.distanceLabel}
                    </span>
                  </div>
                ))}

                <div className={styles.scanBand} />
                <div className={styles.horizon} />

                <div className={styles.directionCard}>
                  <div className={styles.directionArrow}>
                    <span />
                    <span />
                  </div>
                  <p>{directionCopy}</p>
                </div>
              </>
            )}

            {stage === "locateQr" && (
              <>
                <div className={styles.guideFigure}>
                  <Image
                    alt="Minh họa vị trí tem QR trên xe TNGo"
                    className={styles.guideImage}
                    height={392}
                    src="/demo/qr-location-guide.svg"
                    width={320}
                  />
                  <div className={styles.guideLabelQr}>Tem QR</div>
                </div>
                <div className={styles.tipPill}>
                  Tem QR thường nằm gần cổ xe hoặc trên cụm khóa.
                </div>
              </>
            )}

            {stage === "scanQr" && (
              <>
                <div className={styles.stepChip}>Bước 1 / 2</div>
                {permissionState === "granted" && (
                  <div className={styles.scanFocusFrame} aria-hidden="true">
                    <span className={styles.focusCornerTopLeft} />
                    <span className={styles.focusCornerTopRight} />
                    <span className={styles.focusCornerBottomLeft} />
                    <span className={styles.focusCornerBottomRight} />
                  </div>
                )}
                <div className={styles.scanStatusPill}>{qrMessage}</div>
              </>
            )}

            {stage === "confirm" && activeVehicle && (
              <>
                <div className={styles.confirmFrame}>
                  <span className={styles.focusCornerTopLeft} />
                  <span className={styles.focusCornerTopRight} />
                  <span className={styles.focusCornerBottomLeft} />
                  <span className={styles.focusCornerBottomRight} />
                  <div className={styles.qrMatrix}>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className={styles.darkPill}>QR hợp lệ</div>
              </>
            )}

            {stage === "physicalUnlock" && (
              <>
                <div className={styles.stepChip}>Bước 2 / 2</div>
                <div className={styles.guideFigure}>
                  <Image
                    alt="Minh họa vị trí cụm khóa gần bánh sau"
                    className={styles.guideImage}
                    height={392}
                    src="/demo/physical-unlock-guide.svg"
                    width={320}
                  />
                </div>
                <div className={styles.tipPill}>
                  Tìm cụm khóa ở cạnh bánh sau rồi gạt chốt xuống.
                </div>
              </>
            )}

            {stage === "success" && (
              <>
                <div className={styles.darkHudPill}>KHÓA ĐÃ MỞ</div>
                <div className={styles.lightStatusPill}>
                  Bạn có thể lấy xe và bắt đầu chuyến đi
                </div>
              </>
            )}

            {stage === "support" && (
              <>
                <div className={styles.darkHudPill}>{supportContent.hud}</div>
                <div className={styles.lightStatusPill}>{supportContent.pill}</div>
              </>
            )}

            {stage === "unavailable" && (
              <>
                <div className={styles.darkHudPill}>STATUS: UNAVAILABLE</div>
                <div className={styles.lightStatusPill}>Xe này không khả dụng</div>
              </>
            )}
          </div>

          <section className={`${styles.bottomSheet} ${stage === "confirm" ? styles.bottomSheetTall : ""}`}>
            {stage === "tracking" && (
              <>
                <h3>Đang theo dõi xe gần nhất</h3>
                <p>
                  Dùng camera để khóa đúng chiếc xe bạn muốn thuê. Khi đã thấy xe rõ
                  trong khung hình, chuyển sang bước tìm tem QR.
                </p>
                <button
                  className={styles.primaryButton}
                  disabled={permissionState === "loading"}
                  onClick={() => void handleTrackingPrimaryAction()}
                  type="button"
                >
                  Tiếp tục
                </button>
              </>
            )}

            {stage === "locateQr" && (
              <>
                <h3>Bước 1/2: Xác định vị trí tem QR</h3>
                <p>
                  Sau khi tìm đúng xe, đưa camera về vùng cổ xe hoặc khung giữa. Tìm
                  tem QR TNGo trước khi bắt đầu quét.
                </p>
                <button
                  className={styles.primaryButton}
                  onClick={() => void handleLocateQrPrimaryAction()}
                  type="button"
                >
                  Tôi đã thấy mã QR
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setManualCodeOpen(true)}
                  type="button"
                >
                  Nhập mã thủ công
                </button>
              </>
            )}

            {stage === "scanQr" && (
              <>
                <h3>Bước 1/2: Quét mã QR trên xe</h3>
                <p>
                  Giữ điện thoại song song với tem QR. Chỉ khi đọc đúng mã của chiếc xe
                  bạn vừa tìm thấy thì mới chuyển sang bước mở khóa.
                </p>
                <button
                  className={styles.primaryButton}
                  disabled={permissionState === "loading"}
                  onClick={() => void handleScanPrimaryAction()}
                  type="button"
                >
                  {permissionState === "granted" ? "Giữ camera ổn định" : "Bật camera để quét"}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setManualCodeOpen(true)}
                  type="button"
                >
                  Nhập mã thủ công
                </button>
              </>
            )}

            {stage === "confirm" && activeVehicle && (
              <>
                <h3>Xác nhận đúng xe của bạn</h3>

                <article className={styles.vehicleCard}>
                  <div className={styles.vehicleHeader}>
                    <strong>{activeVehicle.id}</strong>
                    <span className={styles.vehicleStatus}>{activeVehicle.statusLabel}</span>
                  </div>

                  <div className={styles.vehicleMeta}>
                    <span>
                      {activeVehicle.typeLabel} • {activeVehicle.batteryLabel}
                    </span>
                    <strong>{activeVehicle.fareLabel}</strong>
                  </div>
                </article>

                <button
                  className={`${styles.insuranceCard} ${
                    insuranceEnabled ? styles.insuranceChecked : ""
                  }`}
                  onClick={() => setInsuranceEnabled((current) => !current)}
                  type="button"
                >
                  <span className={styles.checkbox}>{insuranceEnabled ? "✓" : ""}</span>
                  <span className={styles.insuranceContent}>
                    <strong>{activeVehicle.insuranceLabel}</strong>
                    <small>{activeVehicle.insuranceNote}</small>
                  </span>
                  <span className={styles.insurancePrice}>{activeVehicle.insurancePriceLabel}</span>
                </button>

                <button
                  className={styles.primaryButton}
                  disabled={unlockState === "loading"}
                  onClick={() => void handleUnlockVehicle()}
                  type="button"
                >
                  {unlockState === "loading" ? "Đang gửi lệnh..." : "Mở khóa xe"}
                </button>

                <button
                  className={styles.secondaryButton}
                  onClick={() => setInsuranceEnabled((current) => !current)}
                  type="button"
                >
                  Xem chi tiết bảo hiểm
                </button>
              </>
            )}

            {stage === "physicalUnlock" && (
              <>
                <h3>Bước 2/2: Mở khóa vật lý</h3>
                <p>
                  Sau khi app báo đã gửi lệnh mở khóa, giữ xe đứng yên, tìm cụm khóa bên
                  cạnh bánh sau và kéo hoặc gạt chốt để lấy xe ra.
                </p>
                <button
                  className={styles.primaryButton}
                  onClick={() => goToStage("success")}
                  type="button"
                >
                  Tôi đã mở khóa
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setSupportMode("lockStuck");
                    goToStage("support");
                  }}
                  type="button"
                >
                  Khóa chưa mở?
                </button>
              </>
            )}

            {stage === "success" && (
              <>
                <h3>Mở khóa thành công</h3>
                <article className={styles.infoCard}>
                  <strong>Xe đã được mở khóa</strong>
                  <p>
                    Hệ thống đã ghi nhận phiên thuê. Kiểm tra phanh, yên và khu vực xung
                    quanh trước khi bắt đầu di chuyển.
                  </p>
                </article>
                <button
                  className={styles.primaryButton}
                  onClick={() => router.push("/")}
                  type="button"
                >
                  Bắt đầu chuyến đi
                </button>
              </>
            )}

            {stage === "support" && (
              <>
                <h3>{supportContent.title}</h3>
                <article className={styles.infoCard}>
                  <strong>{supportContent.cardTitle}</strong>
                  <p>{supportContent.body}</p>
                </article>
                <button
                  className={styles.primaryButton}
                  onClick={handleSupportPrimaryAction}
                  type="button"
                >
                  {supportContent.primaryLabel}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => resetToTracking()}
                  type="button"
                >
                  {supportContent.secondaryLabel}
                </button>
              </>
            )}

            {stage === "unavailable" && activeVehicle && (
              <>
                <h3>Chuyển sang xe khác</h3>
                <article className={styles.infoCard}>
                  <strong>QR này thuộc xe không khả dụng</strong>
                  <p>
                    {activeVehicle.unavailableReason ||
                      "Xe đang bảo trì, pin yếu hoặc đã được giữ. Hệ thống sẽ tiếp tục gợi ý xe gần nhất khác để bạn quét lại."}
                  </p>
                </article>
                <button
                  className={styles.primaryButton}
                  onClick={() => resetToTracking()}
                  type="button"
                >
                  Tìm xe khác
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setManualCodeOpen(true)}
                  type="button"
                >
                  Nhập mã xe thủ công
                </button>
              </>
            )}
          </section>

          <div className={styles.homeIndicator} />
        </div>

        <canvas ref={qrCanvasRef} className={styles.hiddenCanvas} />
      </section>

      {manualCodeOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h4>Nhập mã xe hoặc raw QR</h4>
            <p>
              Có thể nhập trực tiếp `vehicle ID` hoặc raw QR value để test nhanh flow mà
              không cần quét camera.
            </p>

            <form className={styles.modalForm} onSubmit={handleManualSubmit}>
              <input
                className={styles.textInput}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Nhập mã xe hoặc raw QR value"
                value={manualCode}
              />
              <div className={styles.modalActions}>
                <button
                  className={styles.modalSecondary}
                  onClick={() => setManualCodeOpen(false)}
                  type="button"
                >
                  Hủy
                </button>
                <button className={styles.modalPrimary} type="submit">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
