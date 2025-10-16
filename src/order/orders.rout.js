const express = require('express');
const {  getOrdersByOrderId, getAllOrders,  deleteOrderById, updateOrderStatus, createOrder, getOrderSuccess, orderSuccess, getAdminStats, getOrdersByUserId, userPayment,  } = require('./order.controller');

const router = express.Router();

router.post("/order", createOrder);
router.post("/success/:tranId", orderSuccess);
router.get("/order/success", getOrderSuccess);

// get orders by orderId
router.get('/order/:id', getOrdersByOrderId);

// get order by email
router.get("/user/email/:id", userPayment);
// get order by userID
router.get("/user/id/:userId", getOrdersByUserId);

// get all orders (admin only)
router.get('/', getAllOrders);

router.get('/:email', getAdminStats);

// update order status (admin only)
router.patch("/update-order-status/:id", updateOrderStatus);

// delete order (admin only)
router.delete("/delete-order/:id", deleteOrderById);

module.exports = router;




