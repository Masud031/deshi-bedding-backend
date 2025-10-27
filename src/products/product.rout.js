const express =  require('express');
const { createNewProduct, getAllProducts, getSingelProducts, updateProductById,  deleteProductById, reduceStock, trendingProducts, getAllFilters, getAllquaryProducts, getAllFilterProducts} = require('./product.controller');
const verifyToken = require('../middlewere/verifytoken');
const verifyAdmin = require('../middlewere/verifyadmin');


// const exports = require;
const router= express.Router();


// ✅ Filtering route (must be before "/:id")
router.get("/filters/:category?", getAllFilters);
router.get("/filter", getAllFilterProducts);


// ✅ Product search & all products
router.get("/search", getAllProducts);
router.get("/", getAllProducts);

// ✅ Trending products
router.get("/trending", trendingProducts);

// ✅ Single product (keep last)
router.get("/:id", getSingelProducts);

// ✅ Create product (admin only)
router.post("/create-product", verifyToken, verifyAdmin, createNewProduct);

// ✅ Update product (admin only)
router.patch("/update-products/:id", verifyToken, verifyAdmin, updateProductById);

// ✅ Delete product (admin only)
router.delete("/:id", verifyToken, verifyAdmin, deleteProductById);

// ✅ Reduce stock after order
router.patch("/reduce-stock/:id", reduceStock);




module.exports = router;
