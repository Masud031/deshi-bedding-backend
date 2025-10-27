const Products = require("../products/product.model");
const { errorResponse, successResponse } = require("../user/responsHandler");
const Reviews = require("./reviews.model");

const postAReview = async (req, res) => {
    try {
        const { comment, rating, userId, productId } = req.body;

        if (!comment || rating === undefined || !productId || !userId) {
            return errorResponse(res, 400, "Missing required fields");
        }

        const existingReview = await Reviews.findOne({ productId, userId });
        if (existingReview) {
            existingReview.comment = comment;
            existingReview.rating = rating;
            await existingReview.save();
        } else {
            const newReview = new Reviews({
                comment,
                rating,
                userId,
                productId,
            });

            await newReview.save();
        }

        const reviews = await Reviews.find({ productId }).sort({ updatedAt: -1 });

        if (reviews.length > 0) {
            const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
            const averageRating = totalRating / reviews.length;

            const product = await Products.findById(productId);

            if (product) {
                product.rating = averageRating;
                await product.save();
            } else {
                return errorResponse(res, 404, "Product not found");
            }
        }

        return successResponse(res, 200, "Review posted successfully", reviews);
    } catch (error) {
        return errorResponse(res, 500, "Failed to post a review", error);
    }
};

// Get user-specific reviews
const getUsersReview = async (req, res) => {
    const {id} = req.params;

    try {
        // if (!userId) {
        //     return errorResponse(res, 400, "Missing user ID")
        // }

        // const reviews = await Reviews.find({userId: userId}).sort({createdAt: -1})
        const reviews = await Reviews.findById(id)

        // if(reviews.length === 0) {
        //     return errorResponse(res, 404, "No reviews found for this user")
        // }

        return successResponse(res, 200, "Reviews fetched successfully", reviews)

    } catch (error) {
        return errorResponse(res, 500, "Failed to get users review", error)
    }
}

// Get total number of reviews
const getTotalReviewsCount = async (req, res) => {
    try {
        const totalReviews = await Reviews.countDocuments({});
        return successResponse(res, 200, "Total reviews fetched successfully", totalReviews);
    } catch (error) {
        return errorResponse(res, 500, "Failed to get users review", error);
    }
};

module.exports = {
    postAReview,
    getUsersReview,
    getTotalReviewsCount,
};
