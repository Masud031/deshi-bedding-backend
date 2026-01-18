const mongoose = require("mongoose");
const crypto = require("crypto");
// const Order = require("./order.model");
const User = require("../user/user.model");
const { errorResponse, successResponse } = require("../user/responsHandler");
const Order = require("./order.model");

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
  !fullName?.trim() ||
  !address?.trim() ||
  !district?.trim() ||
  // !zipCode?.trim() ||
  !phone?.trim()
 
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
        productCode: product.productCode,
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
      orderId: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName,
      address,
      district,
     zipCode: zipCode || "N/A",
      phone,
      deliveryMethod,
      deliveryStatus: deliveryStatus || "pending",
      paymentStatus: paymentStatus || "pending",
      totalPrice,
      paymentMethod,
      userId: userId || null,
      products: formattedProducts,
      transactionId: crypto.randomUUID(), // keep only one
    });
    // ADDITION: Link to user if they exist but forgot to log in
if (!userId) {
  const existingUser = await User.findOne({ phone: phone }); // Adjust 'phone' to match your User Schema field
  if (existingUser) {
    newOrder.userId = existingUser._id;
  }
}

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

    const orders = await Order.find()
      .populate({
        path: "userId",
        select: "username email mobile",
      })
      .populate({
        path: "products.productId",
        select: "productCode name price image",
      })
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return errorResponse(res, 404, "No orders found");
    }

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
  
  status: order.status,
  transactionId: order.transactionId,
  deliveryMethod: order.deliveryMethod,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,

  // user
  userId: order.userId?._id || null,
  userName: order.userId?.username || "N/A",
  email: order.userId?.email || "N/A",
  mobile: order.userId?.mobile || "N/A",

  // products (populated)
  products: order.products.map((p) => ({
    quantity: p.quantity,
    price: p.price,
    productId: p.productId
      ? {
          _id: p.productId._id,
          productCode: p.productId.productCode,
          name: p.productId.name,
          price: p.productId.price,
          image: p.productId.image,
        }
      : null,
  })),
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
    // 1. Get the user's details to find their mobile number
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // 2. Search by userId OR by the phone number associated with the account
    const orders = await Order.find({
      $or: [
        { userId: userId },
        { phone: user.mobile } // Ensure 'phone' is the key in your Order schema
      ]
    }).sort({ createdAt: -1 });
    // const orders = await Order.find({ userId }).sort({ createdAt: -1 });

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
    const { phone } = req.query; // for guest users

    let orders = [];

    // 🔐 CASE 1: Logged-in user (userId)
    if (id && id !== "guest") {
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      orders = await Order.find({
        $or: [
          { userId: user._id },
          { phone: user.phone }, // 👈 attach old guest orders
        ],
      }).sort({ createdAt: -1 });

      return res.status(200).json({ data: orders });
    }

    // 👤 CASE 2: Guest user (phone based)
    if (!phone) {
      return res
        .status(400)
        .json({ message: "Phone number is required for guest orders." });
    }

    orders = await Order.find({ phone }).sort({ createdAt: -1 });

    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error("❌ Failed to fetch user orders:", error);
    res.status(500).json({
      message: "Failed to fetch user orders",
      error: error.message,
    });
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