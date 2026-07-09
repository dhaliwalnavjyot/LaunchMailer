import { Router } from "express";
import { generatePresignedUploadUrl } from "../services/storageService.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// POST /api/upload/request-url
router.post("/upload/request-url", requireAuth, async (req, res) => {
  try {
    const { filename, contentType } = req.body as { filename?: string; contentType?: string };

    if (!filename || !contentType) {
      res.status(400).json({ error: "filename and contentType are required" });
      return;
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      res.status(400).json({ error: `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}` });
      return;
    }

    const result = await generatePresignedUploadUrl(filename, contentType);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Upload URL error");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

export default router;
