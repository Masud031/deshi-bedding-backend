const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("./order.model");
const User = require("../user/user.model");
const { errorResponse, successResponse } = require("../user/responsHandler");

const createOrder = async (req, res) => {
  console.log("Request body:", req.body);

  try {
    const {
      fullName,
      address,
      district,
      zipCode,
      phone,
      totalPrice,
      paymentMethod,
      products,
      deliveryMethod,
      deliveryStatus,
      paymentStatus,
      userId,
    } = req.body;

    // ✅ Validate required fields
    if (
      !fullName ||
      !address ||
      !district ||
      !zipCode ||
      !phone ||
      !totalPrice ||
      !paymentMethod ||
      !products
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ Ensure products is an array
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: "Products must be an array." });
    }

    // ✅ Format products
    const formattedProducts = products.map((product, index) => {
      if (
        !product.productId ||
        !mongoose.Types.ObjectId.isValid(product.productId)
      ) {
        throw new Error(
          `Invalid productId at index ${index}: ${product.productId}`
        );
      }
      if (
        !product.quantity ||
        typeof product.quantity !== "number" ||
        product.quantity <= 0
      ) {
        throw new Error(`Invalid quantity at index ${index}: ${product.quantity}`);
      }
      return {
       productId: product.productId,
        quantity: Number(product.quantity),
        size: product.size || "Not Selected",
        name: product.name,
        category: product.category,
        color: product.color,
        price: Number(product.price),
        image: product.image,
        totalPrice: Number(product.price) * Number(product.quantity),
      };
    });

    // ✅ Create order
    const newOrder = new Order({
      orderId: `ORD-${Date.now()}`,
      fullName,
      address,
      district,
      zipCode,
      phone,
      deliveryMethod,
      deliveryStatus: deliveryStatus || "pending",
      paymentStatus: paymentStatus || "pending",
      totalPrice,
      paymentMethod,
      userId,
      products: formattedProducts,
      transactionId: crypto.randomUUID(), // keep only one
    });

    // ✅ Save
    const savedOrder = await newOrder.save();
    console.log("Order saved:", savedOrder);

    return res.status(201).json({
      message: "Order created successfully!",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      message: "Failed to create order.",
      error: error.message,
    });
  }
};


const orderSuccess = async (req, res) => {
  const { tranId } = req.params; // Extract transaction ID from URL params
  try {
    if (!tranId) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    // Update the order status to "completed" based on the transaction ID
    const updatedOrder = await Order.findOneAndUpdate(
      { transactionId: tranId }, // Filter by transaction ID
      { status: "completed" }, // Update the status field
      { new: true } // Return the updated order document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.status(200).json({ message: "Order marked as successful.", order: updatedOrder });
  } catch (error) {
    console.error("Error handling order success:", error);
    res.status(500).json({ message: "Failed to handle order success.", error: error.message });
  }
};



const getOrderSuccess = async (req, res) => {
  try {
    // Find the most recent successful order
    const lastOrder = await Order.findOne({ status: "completed" }).sort({ createdAt: -1 });

    if (!lastOrder) {
      return res.status(404).json({ message: "No successful orders found." });
    }

    return res.status(200).json({
      message: "Order created successfully! Thank you for your order.",
      order: lastOrder,
    });
  } catch (error) {
    console.error("Error fetching order success:", error);
    return res.status(500).json({ message: "Failed to fetch order success.", error: error.message });
  }
};

const getOrdersByOrderId = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if(!order) {
      return errorResponse(res, 404, "Order not found")
    }
    return successResponse(res, 200, "Order fetched successfully", order)
  } catch (error) {
    return errorResponse(res, 500, "Failed to get order", error)
  }
}

const getAllOrders = async (req, res) => {
  try {
    console.log("Received request for all orders");

    // Fetch orders and populate user info
    const orders = await Order.find()
      .populate({
        path: "userId",
        select: "username email mobile", // only include necessary fields
      })
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return errorResponse(res, 404, "No orders found");
    }

    console.log("Orders found:", orders.length);

    // Flatten populated user data for frontend use
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderId: order.orderId,
      fullName: order.fullName,
      address: order.address,
      district: order.district,
      zipCode: order.zipCode,
      phone: order.phone,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      products: order.products,
      status: order.status,
      transactionId: order.transactionId,
      deliveryMethod: order.deliveryMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      // Flatten user info
      userId: order.userId?._id || null,
      userName: order.userId?.username || "N/A",
      email: order.userId?.email || "N/A",
      mobile: order.userId?.mobile || "N/A",
    }));

    return successResponse(res, 200, "Orders fetched successfully", formattedOrders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return errorResponse(res, 500, "Failed to get all orders", error);
  }
};



const updateOrderStatus = async (req, res) => {
  const {id} = req.params;
  const {status} = req.body;
  if(!status) {
    return errorResponse(res, 400, "Status is required")
  }
  try {
    const updatedOrder = await Order.findByIdAndUpdate(id, {status, updatedAt: Date.now()}, {
      new: true,
      runValidators: true,
    })

    if(!updatedOrder) {
      return errorResponse(res, 404, "Order not found")
    }

    return successResponse(res, 200, "Order status updated successfully", updatedOrder)
  } catch (error) {
    return errorResponse(res, 500, "Failed to update order status", error)
  }
}

const deleteOrderById = async (req, res) => {
  const {id} = req.params;
  try {
    const deletedOrder = await Order.findByIdAndDelete(id);
    if(!deletedOrder) {
      return errorResponse(res, 404, "Order not found")
    }
    return successResponse(res, 200, "Order deleted successfully", deletedOrder)
  } catch (error) {
    return errorResponse(res, 500, "Failed to delete order", error)
  }
}
const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    // if (!orders || orders.length === 0) {
    //   return res.status(404).json({ success: false, message: "No orders found for this user." });
    // }

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders by user ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
};
// user payment //
const userPayment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("➡️ Received email:", id);

     const user = await User.findById(id);
    console.log("👤 Found user:", user);

    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }

    const orders = await Order.find({ userId: user._id });
    console.log("📦 Found orders:", orders);

    res.status(200).json({ data: orders });
  } catch (error) {
    console.error("❌ Failed to fetch user orders:", error);
    res.status(500).json({ message: "Failed to fetch user orders", error: error.message });
  }
};



const getAdminStats = async (req, res) => {
  try {
    // Fetch total earnings from orders
    const totalEarningsResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$totalPrice" } // Summing all order prices
        }
      }
    ]);
        // Extract total earnings
       
 const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].totalEarnings : 0;

  
    const totalOrders = await Order.countDocuments();
    const totalUsers = 0;      // Replace with User.countDocuments() if you have a User model
    const totalProducts = 0;   // Replace with Product.countDocuments()
    const totalReviews = 0;    // Replace with Review.countDocuments()
 // Send the response
 res.status(200).json({
  success: true,
  data: {
    totalEarnings,
    totalOrders,
    totalUsers,
    totalProducts,
    totalReviews
  }
});
} catch (error) {
res.status(500).json({ success: false, message: "Server Error", error });
}
};

module.exports = {
  getOrdersByOrderId,
  getAllOrders,
  updateOrderStatus,
  deleteOrderById,
  createOrder,
  orderSuccess,
  getOrderSuccess,
  getAdminStats,
   getOrdersByUserId,
   userPayment
};