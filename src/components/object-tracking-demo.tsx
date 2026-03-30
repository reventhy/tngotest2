"use client";

import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import styles from "./object-tracking-demo.module.css";
import {
  DEMO_VEHICLES,
  findVehicleByQr,
  getPrimaryVehicle,
  type DemoVehicle,
  type UnlockResponse,
  type VehiclesResponse,
} from "@/lib/demo-data";

type DemoStage = "tracking" | "qr" | "unlock" | "unavailable";
type PermissionState = "idle" | "loading" | "granted" | "denied" | "unsupported";
type ModelState = "idle" | "loading" | "ready" | "error";
type UnlockState = "idle" | "loading" | "success" | "error";

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

type SampleQrCard = {
  id: string;
  title: string;
  value: string;
  svg: string;
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
    return "Huong camera ra cho co xe dap de bat dau theo doi.";
  }

  if (primary.areaRatio < 0.065) {
    return `Di thang ${primary.distanceLabel}`;
  }

  if (primary.centerX < 0.42) {
    return "Xe dang lech trai, xoay camera sang phai.";
  }

  if (primary.centerX > 0.58) {
    return "Xe dang lech phai, xoay camera sang trai.";
  }

  if (primary.centerY < 0.36) {
    return "Ha camera xuong mot chut de bat dung xe.";
  }

  if (primary.centerY > 0.7) {
    return "Nang camera len de can chinh khung hinh.";
  }

  return `Giu khung hinh on dinh, con khoang ${primary.distanceLabel}`;
}

function getTopBarTitle(stage: DemoStage) {
  if (stage === "tracking") {
    return "Quet de tim xe gan nhat";
  }

  if (stage === "qr") {
    return "Dua camera vao tem QR";
  }

  if (stage === "unlock") {
    return "Xac nhan xe va mo khoa";
  }

  return "Xe khong kha dung";
}

function getTrackingLabel(index: number, sourceClass: string) {
  if (index === 0) {
    return "Xe gan nhat";
  }

  if (sourceClass === "motorcycle") {
    return "Xe tro luc";
  }

  return "Xe dap khac";
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

export default function ObjectTrackingDemo() {
  const [stage, setStage] = useState<DemoStage>("tracking");
  const [vehicles, setVehicles] = useState<DemoVehicle[]>(DEMO_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<DemoVehicle | null>(
    getPrimaryVehicle(DEMO_VEHICLES),
  );
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [cameraMessage, setCameraMessage] = useState(
    "Bat camera sau de demo nhan dien xe tren mobile web.",
  );
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [detections, setDetections] = useState<OverlayDetection[]>([]);
  const [directionCopy, setDirectionCopy] = useState(
    "Huong camera ra cho co xe dap de bat dau theo doi.",
  );
  const [qrMessage, setQrMessage] = useState(
    "Dua camera gan va song song voi tem QR.",
  );
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [unlockState, setUnlockState] = useState<UnlockState>("idle");
  const [unlockMessage, setUnlockMessage] = useState("");
  const [manualCodeOpen, setManualCodeOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [sampleQrs, setSampleQrs] = useState<SampleQrCard[]>([]);
  const [dataFetchedAt, setDataFetchedAt] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<DetectionModel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrDetectorRef = useRef<BrowserBarcodeDetector | null>(null);
  const trackingBusyRef = useRef(false);
  const qrBusyRef = useRef(false);
  const qrLockRef = useRef(false);

  const activeVehicle = selectedVehicle ?? getPrimaryVehicle(vehicles);

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
        setDataFetchedAt(payload.fetchedAt);
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
    if (!vehicles.length) {
      return;
    }

    let active = true;

    async function buildQrCards() {
      const targets = [
        vehicles.find((vehicle) => vehicle.status === "available"),
        vehicles.find((vehicle) => vehicle.status === "unavailable"),
      ].filter(Boolean) as DemoVehicle[];

      const cards = await Promise.all(
        targets.map(async (vehicle) => ({
          id: vehicle.id,
          title:
            vehicle.status === "available"
              ? "QR mo khoa thanh cong"
              : "QR unavailable",
          value: vehicle.qrValue,
          svg: await QRCode.toString(vehicle.qrValue, {
            type: "svg",
            errorCorrectionLevel: "H",
            margin: 2,
            width: 320,
            color: { dark: "#111111", light: "#ffffff" },
          }),
        })),
      );

      if (active) {
        setSampleQrs(cards);
      }
    }

    void buildQrCards();

    return () => {
      active = false;
    };
  }, [vehicles]);

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
    if (stage !== "qr") {
      qrLockRef.current = false;
      setManualCodeOpen(false);
      setManualCode("");
    }

    if (stage === "tracking") {
      setUnlockState("idle");
      setUnlockMessage("");
    }
  }, [stage]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setCameraMessage("Trinh duyet nay khong ho tro truy cap camera.");
      return;
    }

    setPermissionState("loading");
    setCameraMessage("Dang khoi dong camera sau...");

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element khong san sang.");
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
      setCameraMessage("Camera dang hoat dong. Dua xe vao trong khung hinh.");
    } catch {
      setPermissionState("denied");
      setCameraMessage("Khong bat duoc camera. Hay cap quyen roi thu lai.");
    }
  }

  async function resolveQrCode(rawValue: string) {
    if (qrLockRef.current) {
      return;
    }

    qrLockRef.current = true;
    const matchedVehicle = findVehicleByQr(vehicles, rawValue);

    if (!matchedVehicle) {
      setQrMessage(
        `Da doc ma "${rawValue}" nhung chua co trong inventory demo. Thu mot QR mau ben canh.`,
      );

      window.setTimeout(() => {
        qrLockRef.current = false;
      }, 1200);
      return;
    }

    setSelectedVehicle(matchedVehicle);
    setQrMessage(`Da nhan dien ${matchedVehicle.id}. Dang chuyen trang...`);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 650);
    });

    startTransition(() => {
      setStage(matchedVehicle.status === "available" ? "unlock" : "unavailable");
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
      setDirectionCopy("Model nhan dien tam thoi khong phan tich duoc frame nay.");
    } finally {
      trackingBusyRef.current = false;
    }
  });

  const runQrStep = useEffectEvent(async () => {
    if (
      qrBusyRef.current ||
      stage !== "qr" ||
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

      setQrMessage("Dua camera gan va song song voi tem QR.");
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
    if (stage !== "qr" || permissionState !== "granted") {
      return;
    }

    const timer = window.setInterval(() => {
      void runQrStep();
    }, 350);

    return () => {
      window.clearInterval(timer);
    };
  }, [permissionState, stage]);

  async function handleUnlockVehicle() {
    if (!activeVehicle) {
      return;
    }

    setUnlockState("loading");
    setUnlockMessage("Dang gui lenh mo khoa toi server demo...");

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
        throw new Error(payload.message || "Khong the mo khoa xe.");
      }

      setUnlockState("success");
      setUnlockMessage(payload.message);
    } catch (error) {
      setUnlockState("error");
      setUnlockMessage(
        error instanceof Error ? error.message : "Khong the mo khoa xe trong luc nay.",
      );
    }
  }

  function resetToTracking() {
    setStage("tracking");
    setUnlockState("idle");
    setUnlockMessage("");
    setQrMessage("Dua camera gan va song song voi tem QR.");
    setSelectedVehicle(getPrimaryVehicle(vehicles));
  }

  async function handleTrackingPrimaryAction() {
    if (permissionState !== "granted") {
      await startCamera();
      return;
    }

    setStage("qr");
  }

  async function handleQrPrimaryAction() {
    if (permissionState !== "granted") {
      await startCamera();
    }
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualCode.trim()) {
      return;
    }

    await resolveQrCode(manualCode.trim());
    setManualCodeOpen(false);
  }

  const trackingPrimaryLabel =
    permissionState === "loading"
      ? "Dang mo camera..."
      : permissionState !== "granted"
        ? "Bat camera demo"
        : detections.length
          ? "Tiep tuc quet"
          : "Huong camera ra xe";

  const qrPrimaryLabel =
    permissionState === "granted" ? "Giu camera on dinh" : "Bat camera de quet";

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>TNGo object tracking demo</p>
        <h1 className={styles.title}>Demo web dung camera that de tim xe va mo khoa.</h1>
        <p className={styles.description}>
          Flow nay giu layout theo Figma, nhung chay tren web bang camera that:
          nhan dien xe dap tren live video, quet QR that va goi local API de mo khoa.
        </p>

        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusLabel}>Camera</span>
            <strong>{permissionState}</strong>
            <p>{cameraMessage}</p>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusLabel}>Object detector</span>
            <strong>{modelState}</strong>
            <p>COCO-SSD chay local trong browser.</p>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusLabel}>Data source</span>
            <strong>Next.js local API</strong>
            <p>{dataFetchedAt ? `Fetched ${new Date(dataFetchedAt).toLocaleTimeString()}` : "Dang tai inventory demo..."}</p>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.phoneStage}>
          <div className={styles.phone}>
            <header className={styles.topBar}>
              <button
                className={styles.backButton}
                onClick={() => {
                  if (stage === "tracking") {
                    void startCamera();
                    return;
                  }

                  resetToTracking();
                }}
                type="button"
              >
                &lt;
              </button>
              <h2>{getTopBarTitle(stage)}</h2>
            </header>

            <div
              className={`${styles.cameraView} ${
                stage === "unlock" || stage === "unavailable" ? styles.cameraViewMuted : ""
              }`}
            >
              <video
                ref={videoRef}
                className={styles.cameraFeed}
                autoPlay
                muted
                playsInline
              />

              <div className={styles.cameraTint} />

              {permissionState !== "granted" && (
                <div className={styles.cameraFallback}>
                  <p className={styles.cameraFallbackTitle}>Camera chua san sang</p>
                  <p className={styles.cameraFallbackBody}>{cameraMessage}</p>
                  <button
                    className={styles.inlineAction}
                    onClick={() => void startCamera()}
                    type="button"
                  >
                    Bat camera
                  </button>
                </div>
              )}

              {stage === "tracking" && permissionState === "granted" && (
                <>
                  <div className={styles.liveChip}>LIVE TRACKING / YOLO</div>

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

              {stage === "qr" && permissionState === "granted" && (
                <>
                  <div className={styles.qrBadge}>Tem QR</div>
                  <div className={styles.qrFrame}>
                    <span className={styles.cornerTopLeft} />
                    <span className={styles.cornerTopRight} />
                    <span className={styles.cornerBottomLeft} />
                    <span className={styles.cornerBottomRight} />
                    <div className={styles.qrVehicleMark} />
                  </div>
                  <div className={styles.tipPill}>{qrMessage}</div>
                </>
              )}

              {stage === "unlock" && activeVehicle && (
                <>
                  <div className={styles.qrReadyFrame}>
                    <span className={styles.cornerTopLeft} />
                    <span className={styles.cornerTopRight} />
                    <span className={styles.cornerBottomLeft} />
                    <span className={styles.cornerBottomRight} />
                    <div className={styles.qrPattern}>
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className={styles.blackBadge}>QR da nhan dien</div>

                  {unlockState !== "idle" && (
                    <div
                      className={`${styles.unlockToast} ${
                        unlockState === "success"
                          ? styles.toastSuccess
                          : unlockState === "error"
                            ? styles.toastError
                            : styles.toastLoading
                      }`}
                    >
                      {unlockMessage}
                    </div>
                  )}
                </>
              )}

              {stage === "unavailable" && (
                <>
                  <div className={styles.statusBadge}>STATUS: UNAVAILABLE</div>
                  <div className={styles.unavailableFrame}>
                    <span className={styles.cornerTopLeft} />
                    <span className={styles.cornerTopRight} />
                    <span className={styles.cornerBottomLeft} />
                    <span className={styles.cornerBottomRight} />
                    <div className={styles.unavailableCross} />
                  </div>
                  <div className={styles.whiteBadge}>Xe nay khong kha dung</div>
                </>
              )}
            </div>

            <section className={styles.bottomSheet}>
              {stage === "tracking" && (
                <>
                  <h3>Dang theo doi xe gan nhat</h3>
                  <p>
                    Camera dang bam theo xe dap gan nhat trong khung hinh. Khi da
                    thay xe ro, chuyen sang buoc quet tem QR.
                  </p>
                  <button
                    className={styles.primaryButton}
                    disabled={permissionState === "loading"}
                    onClick={() => void handleTrackingPrimaryAction()}
                    type="button"
                  >
                    {trackingPrimaryLabel}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setStage("qr")}
                    type="button"
                  >
                    Bo qua huong dan
                  </button>
                </>
              )}

              {stage === "qr" && (
                <>
                  <h3>Canh dung tem QR</h3>
                  <p>
                    Khi tem QR lot vao vung khoa net, he thong se nhan dung ma tren
                    xe. Neu khong co QR ben ngoai, ban co the nhap ma demo thu cong.
                  </p>
                  <button
                    className={styles.primaryButton}
                    disabled={permissionState === "loading"}
                    onClick={() => void handleQrPrimaryAction()}
                    type="button"
                  >
                    {qrPrimaryLabel}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setManualCodeOpen(true)}
                    type="button"
                  >
                    Nhap ma thu cong
                  </button>
                </>
              )}

              {stage === "unlock" && activeVehicle && (
                <>
                  <h3>Xe da san sang de mo khoa</h3>

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
                    <span className={styles.insurancePrice}>
                      {activeVehicle.insurancePriceLabel}
                    </span>
                  </button>

                  <button
                    className={styles.primaryButton}
                    disabled={unlockState === "loading" || unlockState === "success"}
                    onClick={() => void handleUnlockVehicle()}
                    type="button"
                  >
                    {unlockState === "loading"
                      ? "Dang mo khoa..."
                      : unlockState === "success"
                        ? "Xe da mo khoa"
                        : "Mo khoa xe"}
                  </button>

                  <button
                    className={styles.secondaryButton}
                    onClick={() => setStage("unavailable")}
                    type="button"
                  >
                    Bao su co
                  </button>
                </>
              )}

              {stage === "unavailable" && activeVehicle && (
                <>
                  <h3>Chuyen sang xe khac</h3>

                  <article className={styles.warningCard}>
                    <strong>QR nay thuoc xe khong kha dung</strong>
                    <p>
                      {activeVehicle.unavailableReason ||
                        "Xe dang bao tri, pin yeu hoac da duoc giu. He thong se goi y xe gan nhat khac de ban quet lai."}
                    </p>
                  </article>

                  <button
                    className={styles.primaryButton}
                    onClick={() => resetToTracking()}
                    type="button"
                  >
                    Tim xe khac
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setManualCodeOpen(true)}
                    type="button"
                  >
                    Nhap ma xe thu cong
                  </button>
                </>
              )}
            </section>

            <div className={styles.homeIndicator} />
          </div>

          <canvas ref={qrCanvasRef} className={styles.hiddenCanvas} />
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h4>Sample QR de test</h4>
            <p>
              Neu demo tren phone, hay mo ma nay tren laptop khac hoac in ra. Neu
              khong co man hinh thu hai, dung nut nhap ma thu cong.
            </p>
            <div className={styles.qrGrid}>
              {sampleQrs.map((card) => (
                <div key={card.id} className={styles.qrCard}>
                  <div
                    aria-label={card.title}
                    className={styles.qrImage}
                    dangerouslySetInnerHTML={{ __html: card.svg }}
                  />
                  <strong>{card.title}</strong>
                  <code>{card.value}</code>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panelCard}>
            <h4>Demo notes</h4>
            <ul className={styles.noteList}>
              <li>Buoc tim xe dung camera that + model COCO-SSD tren browser.</li>
              <li>Buoc QR ho tro BarcodeDetector va fallback jsQR.</li>
              <li>Du lieu xe va lenh mo khoa di qua route API trong Next.js.</li>
              <li>Deploy thang len Vercel, khong can backend rieng de demo.</li>
            </ul>
          </div>
        </aside>
      </section>

      {manualCodeOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h4>Nhap ma xe hoac QR demo</h4>
            <p>
              Vi du: <code>TNGO:X29Q-24.111</code> hoac{" "}
              <code>TNGO:UNAVAILABLE:Z88U-05.502</code>
            </p>

            <form className={styles.modalForm} onSubmit={handleManualSubmit}>
              <input
                className={styles.textInput}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Nhap ma xe hoac raw QR value"
                value={manualCode}
              />
              <div className={styles.modalActions}>
                <button className={styles.modalSecondary} onClick={() => setManualCodeOpen(false)} type="button">
                  Huy
                </button>
                <button className={styles.modalPrimary} type="submit">
                  Xac nhan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
