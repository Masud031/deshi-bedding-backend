const express = require('express');
const User = require('../../src/user/user.model');
const Reviews = require('../../src/reviews/reviews.model');
const Products = require('../../src/products/product.model');
const Order = require('../order/order.model');
const { successResponse, errorResponse } = require('../user/responsHandler');
const router = express.Router();

// user stats
router.get("/user-stats/:id", async(req, res) => {
    const {id} = req.params;
    console.log("Incoming user-stats param:", req.params);

    if(!id) {
        return errorResponse(res, 400, "Email is required")
    }
     try {
        // const user = await User.findOne({id});
        const user = await User.findById(req.params.id);
        if(!user) {
            return errorResponse(res, 404, "User not found")
        }

        // total payments
        // total payments
    const totalPaymentsResult = await Order.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, totalAmount: { $sum: "$totalPrice" } } },
    ]);

        const totalPaymentsAmount =  totalPaymentsResult.length > 0 ? totalPaymentsResult[0].totalAmount : 0

        // total reviews
        const totalReviews =  await Reviews.countDocuments({userId: user._id})
        
        const  purchasedProductsIds = await Order.distinct("products.productId", { userId: user._id});
       const totalPurchadedProducts = purchasedProductsIds.length;

         // Get Purchase Details (from Order collection)
   const purchaseInfo = await Order.find({ userId: user._id })
      .select("orderId totalPrice paymentMethod status createdAt products");

       return successResponse(res, 200, "Fetched User stats successfully", {
        totalPayments: parseFloat(totalPaymentsAmount.toFixed(2)),
        totalReviews,
        totalPurchadedProducts,
         purchaseInfo, 
       })
     } catch (error) {
        return errorResponse(res, 500, "Couldn't get user stats", error)
     }
})

// admin stats
router.get('/admin-stats', async (req, res) => {
    try {
      // Count total orders
      const totalOrders = await Order.countDocuments();
  
      // Count total products
      const totalProducts = await Products.countDocuments();
  
      // Count total reviews
      const totalReviews = await Reviews.countDocuments();
  
      // Count total users
      const totalUsers = await User.countDocuments();
  
      // Calculate total earnings by summing the 'amount' of all orders
      const totalEarningsResult = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: "$amount" },
          },
        },
      ]);
  
      const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].totalEarnings : 0;
  
      // Calculate monthly earnings by summing the 'amount' of all orders grouped by month
      const monthlyEarningsResult = await Order.aggregate([
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            monthlyEarnings: { $sum: "$amount" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 } // Sort by year and month
        }
      ]);
  
      // Format the monthly earnings data for easier consumption on the frontend
      const monthlyEarnings = monthlyEarningsResult.map(entry => ({
        month: entry._id.month,
        year: entry._id.year,
        earnings: entry.monthlyEarnings,
      }));
  
      // Send the aggregated data
      res.status(200).json({
        totalOrders,
        totalProducts,
        totalReviews,
        totalUsers,
        totalEarnings, 
        monthlyEarnings, 
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats", error: error.message });

    }
  });


module.exports = router;