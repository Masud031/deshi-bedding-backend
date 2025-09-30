const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensures orderId is always unique
    },
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    totalPrice: { type: Number, required: true, default: 0 },
    paymentMethod: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    // Optional, if the order is linked to a user
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        category: { type: String, required: true },
        color: { type: String, required: true },
        price: { type: Number, required: true },
        size: { type: String, default: "Not Selected" },
        quantity: { type: Number, required: true },
        image: { type: String, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "completed"],
      default: "pending",
    },
    transactionId: { type: String, index: true },// Changed to String (for payment system)
    amount: { type: Number, default: 0 }, // Optional, can store the amount for verification
    trackingCode: { type: String }, // Optional, for shipping
    deliveryDate: { type: Date }, // Optional, for shipping
    comments: { type: String }, // Optional, for customer/admin comments
    shippingMethod: { type: String }, // Optional, for shipping
    trackingUrl: { type: String }, // Optional, for tracking link
    deliveredDate: { type: Date }, // When delivered
    cancelledDate: { type: Date }, // When cancelled
    // deliveryAddress: { type: String },
    // deliveryPhone: { type: String },
    deliveryMethod: { type: String }, // e.g., "Standard", "Express"

  
  },
  { timestamps: true } //  Adds createdAt and updatedAt fields automatically
);

//  Auto-generate `orderId` if missing
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}`; // Generate a unique Order ID
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
