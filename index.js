require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');



const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080'],
  credentials: true,
}));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "20mb",
}));
app.use(cookieParser());

app.set('etag', false);

// Routes
const UserRoutes = require('./src/user/user.routs');
const ProductsRoutes = require('./src/products/product.rout');
const ReviewsRoutes = require('./src/reviews/reviews.rout'); 
const OrdersRoutes = require('./src/order/orders.rout');
const StatsRoutes = require('./src/states/stats.route');
const UploadImage = require("./src/utilis/UploadImage");


async function main() {
  try {
    // Connect to MongoDB before setting up routes
    await mongoose.connect(process.env.DB_URL);
    // mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("MongoDB connected successfully!");

    // Define routes AFTER database connection
    app.use('/api/auth', UserRoutes);
    app.use('/api/products', ProductsRoutes);
    app.use('/api/reviews', ReviewsRoutes);
    app.use('/api/order', OrdersRoutes);
    app.use('/api/stats', StatsRoutes);
    

    app.get('/', (req, res) => {
      res.send('Lebaba E-commerce Server is running!');
    });

    app.post('/user', (req, res) => {
      const userData = req.body;
      console.log('User data received:', userData);
      res.status(200).send({ message: 'User saved successfully', user: userData });
    });

    // Upload image API
app.post("/api/uploadImage", async (req, res) => {
  try {
    const url = await UploadImage(req.body.image);

    return res.status(200).json({
      success: true,
      imageUrl: url,
    });
  } catch (error) {
    console.error("❌ Error in Cloudinary upload:", error);

    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
});
 
    // Start server AFTER database connection
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

// Run the server
main();
