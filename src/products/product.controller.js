const Reviews = require("../reviews/reviews.model");
const { errorResponse, successResponse } = require("../user/responsHandler");
const Products = require("./product.model");


const createNewProduct = async (req, res) => {
    try {
        const newProduct =  new Products({
            ...req.body
        })

        const savedProduct =  await newProduct.save();

        // calculate avarage rating
        const reviews = await Reviews.find({productId: savedProduct._id })
        if(reviews.length > 0) {
            const totalRating =  reviews.reduce((acc, review) => acc + review.rating, 0 )
            const avarageRating = totalRating / reviews.length;
            savedProduct.rating = avarageRating;
            await savedProduct.save();
        }

        return successResponse(res, 200, "Product created successfully", savedProduct)
        
    } catch (error) {
        return errorResponse(res, 500, "Failed to create new product", error)
    }
}
// get all products//

const getAllProducts = async (req, res) => {
    try {
        const {category, color, minPrice, maxPrice, page=1, limit=10} = req.query;
        const filter = {};
        if(category && category !== 'all') {
            filter.category = category;
        }
        if(color && color !== 'all') {
            filter.color = color;
        }
        if(minPrice && maxPrice) {
            const min = parseFloat(minPrice);
            const max = parseFloat(maxPrice);
            if(!isNaN(min) && !isNaN(max)) {
                filter.price = {$gte: min, $lte: max}
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalProducts =  await Products.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / parseInt(limit))


        const products = await Products.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'email username')
        .sort({createdAt: -1})
        ;

        return successResponse(res, 200, "Products fetched successfully", data={
            products,
            totalProducts,
            totalPages
        })
    } catch (error) {
        return errorResponse(res, 500, "Failed to get products", error);
    }
}

// getting single product//
const  getSingelProducts = async (req, res) => {
    const {id} = req.params;
    try {
        const product  = await Products.findById(id).populate('author', 'username email');

        if(!product) {
            return errorResponse(res, 404, "Product not found")
        }
        const reviews=  await Reviews.find({productId: id}).populate('userId', 'username email')

        return successResponse(res, 200, "Single Product and reviews ",{product, reviews})

    } catch (error) {
        return errorResponse(res, 500, "Failed to get single product", error)
    }
};
// update product//

const updateProductById  = async (req, res) => {
    const productId =  req.params.id;
     try {
        const updatedProduct =  await Products.findByIdAndUpdate(productId, {...req.body}, {
            new: true
        })

        if(!updatedProduct) {
            return errorResponse(res, 404, "Product not found")
        }

        return successResponse(res, 200, "Product updated successfully", updatedProduct)

      } catch (error) {
        return errorResponse(res, 500, "Failed to update", error)
     }
}



// delete product//

const  deleteProductById =  async (req, res) => {
    const productId = req.params.id;
    try {
        const deletedProduct = await Products.findByIdAndDelete(productId);

        if(!deletedProduct) {
            return errorResponse(res, 404, "Product not found")
        }
        await Reviews.deleteMany({productId: productId});
        return successResponse(res, 200, "Product deleted successfully")

    } catch (error) {
        return errorResponse(res, 500, "Failed to delete", error)
    }
}

// routes/products.js
const reduceStock = async (req, res) => {
  try {
    const { quantityOrdered, selectedSize } = req.body;
    const { id } = req.params;

    // 1. Basic validation of incoming data
    if (!selectedSize || !quantityOrdered) {
      return errorResponse(res, 400, "Quantity and selectedSize are required.");
    }
    
    // 2. Perform the atomic update and get the updated product
    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { $inc: { [`stock.${selectedSize}`]: -quantityOrdered } },
      { new: true } // Returns the updated document
    );

    // 3. Check for product and stock
    if (!updatedProduct) {
      return errorResponse(res, 404, "Product not found or size key does not exist.");
    }
    
    // 4. Validate stock after the update
    if (updatedProduct.stock[selectedSize] < 0) {
       // Revert the change if the quantity went below zero
      await Products.findByIdAndUpdate(
        id,
        { $inc: { [`stock.${selectedSize}`]: +quantityOrdered } }
      );
      return errorResponse(res, 400, "Not enough stock available.");
    }

    // 5. Respond with success
    return successResponse(res, 200, "Stock updated successfully.", updatedProduct);

  } catch (error) {
    // 6. Handle server-side errors
    console.error("Error reducing stock:", error);
    return errorResponse(res, 500, "Failed to update stock.", error);
  }
};


const trendingProducts = async (req, res) => {
  try {
    const trendingProducts = await Products.find({ isTrending: true });
    res.status(200).json(trendingProducts);
  } catch (error) {
     res.status(500).json({ message: "Failed to fetch trending products", error })
  }
};



module.exports = {
    createNewProduct,
    getAllProducts,
    getSingelProducts,
    updateProductById,
    deleteProductById,
    reduceStock,
    trendingProducts
 
}

// app .patch('api/order/:id') async(req,res)=>{
//     console.log(req.params);
//     const orderId=req.params.id;
//     try{
//         const result= await Customer .findOneAndUpdate(
//             {'order._id':orderId},
//             {$set:{'orders.$':req.body}},
//             {new:true}
//         )
//         console.log(result);
// if(result){
//     res.json(result)
// }else{
//     res.status(4o4).json({erro:'somthinng went wrong'})
// }
//     catch(e)

//     }

// }


