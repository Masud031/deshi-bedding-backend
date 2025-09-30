const express =  require('express');
const { createNewProduct, getAllProducts, getSingelProducts, updateProductById,  deleteProductById, reduceStock, trendingProducts } = require('./product.controller');
const verifyToken = require('../middlewere/verifytoken');
const verifyAdmin = require('../middlewere/verifyadmin');


// const exports = require;
const router= express.Router();

// creat product (only admin);
router.post('/create-product',verifyToken ,verifyAdmin, createNewProduct,);

router.get('/',getAllProducts);
//for trending fetching 
router.get("/trending", trendingProducts)
// get singel products .
router.get('/:id',getSingelProducts);

// update product (admin only)
router.patch("/update-product/:id",verifyToken, verifyAdmin, updateProductById)
// Delete product//
router.delete("/:id",verifyToken, verifyAdmin, deleteProductById)

// ✅ Reduce stock after order
router.patch("/reduce-stock/:id", reduceStock);



module.exports = router;
