## TNGo Object Tracking Demo

Demo web cho flow live:

- Tim xe gan nhat bang live camera
- Quet tem QR that tren camera
- Mo khoa xe qua local API
- Xu ly nhanh xe khong kha dung
- Tach QR mau sang route rieng `/sample-qr`

Project dung Next.js App Router, deploy duoc thang len Vercel.

## Chay local

```bash
npm install
npm run dev
```

Mo `http://localhost:3000` cho live demo.

Trang QR mau:

- `http://localhost:3000/sample-qr`

## Cach test tren dien thoai

1. Cho phep truy cap camera sau.
2. Dua camera vao xe dap/xe dien de model COCO-SSD bat object `bicycle`.
3. O buoc quet QR, mo `http://localhost:3000/sample-qr` tren man hinh thu hai hoac nhap ma thu cong.

QR demo:

```bash
TNGO:X29Q-24.111
TNGO:UNAVAILABLE:Z88U-05.502
```

## Scripts

- `npm run dev`: chay local
- `npm run lint`: lint
- `npm run build`: build production

## API demo

- `GET /api/vehicles`: inventory xe demo
- `POST /api/unlock`: mo khoa xe demo

Khong can backend rieng de deploy demo.

## Deploy len Vercel

```bash
npm run build
```

Sau do import repo nay vao Vercel la deploy duoc ngay. Khong can them env vars.

Neu deploy de test tren phone, nen mo site bang HTTPS de browser cap quyen camera day du.

## Ghi chu ky thuat

- Object detection: `@tensorflow-models/coco-ssd`
- QR scan: `BarcodeDetector` + fallback `jsQR`
- UI: Next.js + CSS Modules

# tngotest2
