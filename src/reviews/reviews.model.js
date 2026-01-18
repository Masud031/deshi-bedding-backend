const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
      default: "No comment provided"
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    }
  },
  { timestamps: true }
);

const Reviews = mongoose.model("Review", ReviewSchema);

module.exports = Reviews;
