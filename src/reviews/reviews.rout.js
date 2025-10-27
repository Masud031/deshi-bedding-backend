const express = require('express');
const { postAReview, getUsersReview, getTotalReviewsCount } = require('./reviews.controller');
const verifyToken = require('../middlewere/verifytoken');
const router = express.Router();

// post a review
router.post("/post-review",verifyToken,postAReview);
// router.post("/reviews", postAReview);
// review counts 
router.get("/total-reviews",verifyToken, getTotalReviewsCount )

// get review data for user
router.get("/:id",verifyToken, getUsersReview);

module.exports =router;
