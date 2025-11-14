const express = require("express");
const multer = require("multer");
const path = require("path");
const Banner = require("../Banner/banner.model"); // no .js needed in CJS

const router = express.Router();

// === Multer Storage Config ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/banner/"); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// === POST or UPDATE Banner ===
router.post("/upload", upload.single("bannerImage"), async (req, res) => {
  try {
    const { route, heading, paragraph } = req.body;
    const imageUrl = `/uploads/banner/${req.file.filename}`;

    let banner = await Banner.findOne({ route });

    if (banner) {
      banner.heading = heading;
      banner.paragraph = paragraph;
      banner.imageUrl = imageUrl;
      await banner.save();
      return res.json({ success: true, message: "Banner updated", banner });
    }

    banner = new Banner({ route, heading, paragraph, imageUrl });
    await banner.save();

    res.json({ success: true, message: "Banner created", banner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// === GET all banners ===
router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json({ success: true, banners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// === GET banner by route (for frontend dynamic fetch) ===
router.get("/route", async (req, res) => {
  try {
    const route = req.query.path;
    const banner = await Banner.findOne({ route });
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    res.json({ success: true, banner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
