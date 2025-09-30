const express = require('express');
const {  getOrdersByOrderId, getAllOrders,  deleteOrderById, updateOrderStatus, createOrder, getOrderSuccess, orderSuccess, getAdminStats,  } = require('./order.controller');

const router = express.Router();
// router.get('/init', makePaymentRequest);
// create checkout session
// router.post('/create-checkout-session', makePaymentRequest);
// / SSLCommerz success callback route
router.post("/order", createOrder);
router.post("/success/:tranId", orderSuccess);
router.get("/order/success", getOrderSuccess);

// get orders by orderId
router.get('/order/:id', getOrdersByOrderId);

// get all orders (admin only)
router.get('/', getAllOrders);

router.get('/:email', getAdminStats);



// update order status (admin only)
router.patch("/update-order-status/:id", updateOrderStatus);

// delete order (admin only)
router.delete("/delete-order/:id", deleteOrderById);



module.exports = router;




