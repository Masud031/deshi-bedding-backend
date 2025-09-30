const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: String,
    description: String,
    price: {
        type: Number,
        required: true
    },
    oldPrice: Number,
    image: {
        type: String,
        required: true
    },
    color: String,
    rating: {
        type: Number,
        default: 0
    },
    stock: {
        type: Map,
        of: Number,
        required: true,
        default: {}
    },
    author: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
      isTrending: { type: Boolean, default: false }
}, {
    timestamps: true
});

const Products = mongoose.model("Product", productSchema);

module.exports = Products;
