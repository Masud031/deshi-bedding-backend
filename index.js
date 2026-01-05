require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const app = express();

/* ======================
   ENV CONFIG
====================== */
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

/* ======================
   SECURITY & MIDDLEWARE
====================== */
app.disable("x-powered-by"); // hide Express info

app.use(
  cors({
    origin:
      NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" })); // ⬅ global body limit
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

app.set("etag", false);

/* ======================
   ROUTES
====================== */
const UserRoutes = require("./src/user/user.routs");
const ProductsRoutes = require("./src/products/product.rout");
const ReviewsRoutes = require("./src/reviews/reviews.rout");
const OrdersRoutes = require("./src/order/orders.rout");
const StatsRoutes = require("./src/states/stats.route");
const UploadImage = require("./src/utilis/UploadImage");

app.use("/api/auth", UserRoutes);
app.use("/api/products", ProductsRoutes);
app.use("/api/reviews", ReviewsRoutes);
app.use("/api/order", OrdersRoutes);
app.use("/api/stats", StatsRoutes);

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BDhabibi.com Server is running",
    env: NODE_ENV,
  });
});

// Upload Image//

  app.post('/api/uploadImage', (req, res) => {
    UploadImage(req.body.image)
        .then((url) => res.send(url))
        .catch((error) => {
            console.error("❌ Error in Cloudinary upload:", error.message);
            res.status(500).json({ error: "Image upload failed" });
        });
});

/* ======================
   GLOBAL ERROR HANDLER
====================== */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
  });
});

/* ======================
   DB + SERVER START
====================== */
async function startServer() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("✅ MongoDB connected");
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // stop app if DB fails
  }
}

startServer();
