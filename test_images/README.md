# 👁️ MedVisionAI Test Images Repository

This directory contains organized folders for storing and categorizing retinal fundus test scans for screening evaluations.

---

## 📁 Directory Structure

```text
test_images/
├── raw/                # 📥 Drop ALL your unclassified / bunched dataset images here!
│   └── .gitkeep
├── samples/            # Quick testing sample scans
│   └── quick_test_scan.jpg
```

---

## 📷 Supported Image Formats & Guidelines

* **Formats**: `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`
* **Resolution**: Minimum **224 × 224** pixels (recommended **512 × 512** or higher for optimal Grad-CAM localization).
* **Color Space**: 3-channel RGB fundus photographs.
* **Fields of View**: Standard $45^\circ$ or $50^\circ$ macula-centered or disc-centered fundus scans.

---

## 🚀 How to Test in MedVisionAI

1. Log into the Clinical Dashboard at [http://localhost:5173](http://localhost:5173) as `dr.screening` / `D0ct0r@Scan#2026`.
2. Under **Run Screening**, select a registered patient profile.
3. Choose an image file from any category folder above.
4. Click **Run AI Diagnostic Inference & Generate Heatmap** to view:
   * Side-by-side fundus scan & Grad-CAM neural attention heatmap.
   * Color-coded visual confidence gauge.
   * Quadrant activation clinical explanation.
   * Tiered ophthalmology referral recommendation.
   * Instant ReportLab PDF download.
