const Reviews = require("../reviews/reviews.model");
const { errorResponse, successResponse } = require("../user/responsHandler");
const Products = require("./product.model");

const generateProductCode = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `PRD-${randomNum}`;
};
// ✅ Helper function to ensure unique product code
const generateUniqueProductCode = async () => {
  let uniqueCode = generateProductCode();
  let exists = await Products.findOne({ productCode: uniqueCode });

  // Keep generating until a unique one is found
  while (exists) {
    uniqueCode = generateProductCode();
    exists = await Products.findOne({ productCode: uniqueCode });
  }

  return uniqueCode;
};


const createNewProduct = async (req, res) => {
    try {
      let { productCode } = req.body;

    // ✅ Auto-generate and ensure uniqueness if not provided
    if (!productCode || productCode.trim() === "") {
      productCode = await generateUniqueProductCode();
    } else {
      // Even if user provides one, check if it already exists
      const existingProduct = await Products.findOne({ productCode });
      if (existingProduct) {
        return res
          .status(400)
          .json({ success: false, message: "Product code already exists. Please use a different one." });
      }
    }

        const newProduct =  new Products({
            ...req.body,
              productCode,
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
// The single, comprehensive function for all fetching, filtering, and searching
const getAllProducts = async (req, res) => {
    try {
        // 1. **CRITICAL FIX: Get all parameters**
        const { category, color,size, styleCategory , minPrice, maxPrice, page = 1, limit = 10 } = req.query;
        
        // **CRITICAL FIX: Determine the actual search term from the request**
        // This handles both req.query.search (from one RTK Query hook) 
        // AND req.query.query (from the other RTK Query hook /search route)
        const searchTerm = req.query.search || req.query.query; 
        

        let finalFilter = {};
        const conditions = []; // Array to hold individual filtering/search conditions

        // --- Build individual conditions --

// product.controller.js (Inside getAllProducts/searchProductsController)

if (searchTerm) {
    // 1. Properly escape the search term to treat special characters literally
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 2. 💡 CRITICAL FIX: The MongoDB standard string format.
    //    We explicitly add the '.*' wildcards for substring matching.
    const regexPatternString = `.*${escapedSearchTerm}.*`;
    
    conditions.push({
        $or: [
            // Use the $regex operator with a string, and $options for 'i'
            { name: { $regex: regexPatternString, $options: "i" } },
            { category: { $regex: regexPatternString, $options: "i" } },
            { description: { $regex: regexPatternString, $options: "i" } },
            { color: { $regex: regexPatternString, $options: "i" } },
             { productCode: { $regex: regexPatternString, $options: "i" } },
             { orderId: { $regex: regexPatternString, $options: "i" } },
        ]
    });
}

        // 2. Category Condition
        if (category && category !== 'all') {
            conditions.push({ category: category });
        }
        
        // 3. Color Condition
        if (color && color !== 'all') {
            conditions.push({ color: color });
        }

        // size 
 if (req.query.size) {
    let selectedSizes = req.query.size;

    // Multiple sizes (38,40)
    if (typeof selectedSizes === "string") {
        selectedSizes = selectedSizes.split(",");
    }

    if (!Array.isArray(selectedSizes)) {
        selectedSizes = [selectedSizes];
    }

    const sizeOrConditions = selectedSizes.map((s) => ({
        [`stock.${s.trim()}`]: { $exists: true, $gt: 0 }
    }));

    conditions.push({ $or: sizeOrConditions });
}
        
        // 4. Price Condition
        if (minPrice || maxPrice) {
            const priceCondition = {};
            if (minPrice) priceCondition.$gte = Number(minPrice);
            if (maxPrice) priceCondition.$lte = Number(maxPrice);
            conditions.push({ price: priceCondition });
        }
          // style category
          if (styleCategory) {
            let list = Array.isArray(styleCategory)
                ? styleCategory
                : styleCategory.split(",");

            // Don't override existing style filter
            conditions.push({
                style: { $in: list.map(s => new RegExp(s, "i")) }
            });
        }

        // --- Combine Conditions ---
        if (conditions.length > 0) {
            finalFilter = { $and: conditions };
        } else {
            finalFilter = {}; 
        }

        

        // --- Execute Query ---
        const skip = (Number(page) - 1) * Number(limit);
        const totalProducts = await Products.countDocuments(finalFilter);
        const totalPages = Math.ceil(totalProducts / Number(limit));

        const products = await Products.find(finalFilter)
            .skip(skip)
            .limit(Number(limit))
           

        return successResponse(res, 200, "Products fetched successfully", {
            products,
            totalProducts,
            totalPages,
        });
    } catch (error) {
        console.error("Mongoose Query Error:", error); 
        return errorResponse(res, 500, "Failed to get products", error);
    }
};


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
// filtering product//






// ✅ Get filters for all products OR for specific category
// product.controller.js
const getAllFilters = async (req, res) => {
  try {
    const categoryParam = req.params.category;
    const { priceMin, priceMax } = req.query;

    const query = {};

    if (categoryParam && categoryParam.toLowerCase() !== "all") {
      query.category = { $regex: new RegExp(`^${categoryParam}$`, "i") };   
    }
       // Price filter
   if (priceMin || priceMax) {
  query.price = {};

  if (priceMin) query.price.$gte = Number(priceMin);
  if (priceMax) query.price.$lte = Number(priceMax);
}

    // Fetch all relevant product fields
    const products = await Products.find(query, "category color price stock style");
    
       if (!products.length) {
      return res.status(200).json({
        success: true,
        message: "No products found for this category",
        data: { categories: [], sizes: [], colors: [], styles: [], priceRanges: [],styleCategories: [] },
      });
    }

    // ✅ Categories
    const categories = [...new Set(products.map(p => p.category?.toLowerCase()).filter(Boolean))];

    // ✅ Colors
    const colors = [...new Set(products.map(p => p.color?.toLowerCase()).filter(Boolean))];

    // ✅ Sizes
    const sizesSet = new Set();
    products.forEach(p => {
       
      let stockObj = p.stock;

      if (stockObj instanceof Map) {
        stockObj = Object.fromEntries(stockObj);
      } else if (typeof stockObj?.toObject === "function") {
        stockObj = stockObj.toObject();
      }
      if (stockObj && typeof stockObj === "object") {
        Object.keys(stockObj).forEach(size => sizesSet.add(size));
      }
    });
    let sizes = [...sizesSet];
     // ✅ Normalize categoryParam for flexible matching
    const normalizedCategory = 
    categoryParam?.toLowerCase()?.replace(/\s+/g, "-")?.trim();

    if (normalizedCategory && normalizedCategory !== "all") {
  query.category = { $regex: new RegExp(`^${normalizedCategory}$`, "i") };
}
    

 const categorySizeMap = {
  "kids-panjabi": [20, 22, 24, 26, 28, 30,32,34,36],
  "panjabi": [38, 40, 42, 44, 46],
  "big-size": [46, 48, 50],
  "sheroany": [38,40,42,44,46],
  "payjama": [38,40,42,44],
  "koti": [36,38,40,42,44,46],
  "kids-sheroany": [24,26,28,30,32,34,36],
  "trending": [38,40,42,44,46],
};
    // ✅ Apply override if category matches
for (const [key, value] of Object.entries(categorySizeMap)) {
  if (normalizedCategory?.includes(key)) {
    sizes = value;
    break;
  }
}
    // ✅ Styles
    const styles = [...new Set(products.map(p => p.style?.toLowerCase()).filter(Boolean))];

    // ✅ Price ranges
    // const priceRanges = [
    //   { label: "Under 50", min: 0, max: 50 },
    //   { label: "50 - 100", min: 50, max: 100 },
    //   { label: "100 - 200", min: 100, max: 200 },
    //   { label: "200 and above", min: 200, max: null },
    // ];

     // 🟢 Dynamic Price Range Generator
  
// Dynamic Price Range Generator
const productPrices = products
  .map((p) => p.price)
  .filter((price) => typeof price === "number" && price > 0);

// rename to avoid conflict
const calculatedMaxPrice = Math.max(...productPrices);

let step;
if (calculatedMaxPrice <= 500) step = 100;
else if (calculatedMaxPrice <= 1000) step = 200;
else if (calculatedMaxPrice <= 2000) step = 300;
else if (calculatedMaxPrice <= 5000) step = 500;
else step = 1000;

const priceRanges = [];

for (let i = 0; i < calculatedMaxPrice; i += step) {
  priceRanges.push({
    label: `${i} - ${i + step}`,
    min: i,
    max: i + step,
  });
}

priceRanges.push({
  label: `${calculatedMaxPrice}+`,
  min: calculatedMaxPrice,
  max: null,
});

    // style category//
    const styleCategoryMap = {
  "panjabi": ["simple", "casual","embroidered","gorgeous", "wedding"],
  "kids-panjabi": ["simple","gorgeous", "embroidered", "party"],
  "big-size": ["simple","gorgeous", "embroidered"],
  "sheroany": ["gorgeous", "simple", "royal", "wedding"],
};

let styleCategories = [];

for (const [key, list] of Object.entries(styleCategoryMap)) {
  if (normalizedCategory?.includes(key)) {
    styleCategories = list;
    break;
  }
}

    res.status(200).json({
      success: true,
      message: "Filters fetched successfully",
      data: { categories, sizes, colors, styles, priceRanges,  styleCategories,  },
    });
  } catch (err) {
    console.error("getAllFilters error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch filters" });
  }
};

// ✅ product.controller.js
const getAllFilterProducts = async (req, res) => {
  try {
    const {
      category,
      color,
      size,
      style,
      styleCategory,
      priceMin,
      priceMax,
      page = 1,
      limit = 8,
    } = req.query;

    const query = {};

    // CATEGORY
    // if (category && category.toLowerCase() !== "all") {
    //   query.category = { $regex: new RegExp(`^${category}$`, "i") };
    // }


if (category && category.toLowerCase() !== "all") {
        const normalizedCategory = category.toLowerCase().trim();
        // Use the syntax that WORKS in getAllFilters:
        query.category = { $regex: new RegExp("^" + normalizedCategory + "$", "i") };
        
    }
  
  // STYLE CATEGORY (does NOT override style)
if (styleCategory) {
  const styles = styleCategory.split(",").map(s => new RegExp(`^${s}$`, "i"));
  query.styleCategory = { $in: styles };
}


console.log("Query received:", req.query);
console.log("Mongo query:", JSON.stringify(query, null, 2));

    // COLOR (supports array or single)
    if (color) {
      const colors = Array.isArray(color) ? color : [color];
      query.color = { $in: colors.map((c) => new RegExp(c, "i")) };
    }

    // STYLE (supports array or single)
    if (style) {
      const styles = Array.isArray(style) ? style : [style];
      query.style = { $in: styles.map((s) => new RegExp(s, "i")) };
    }
 


    // SIZE (robust parsing + safe composition)
// if (size) {
//   const sizes = typeof size === "string" ? size.split(",") : size;
//   // Filter products that have stock >0 for ANY of the selected sizes
//   query.$or = sizes.map((s) => ({
//     [`stock.${s}`]: { $exists: true, $gt: 0 },
//   }));
// }


//   if (size) {
//   const selectedSizes = typeof size === "string" ? [size] : size;

//   query.$or = selectedSizes.map((s) => ({
//     [`stock.${s}`]: { $exists: true, $gt: 0 }
//   }));
// }
if (size) {
  let selectedSizes = typeof size === "string" ? size.split(",") : size;
  selectedSizes = selectedSizes.map(s => s.trim());

  if (selectedSizes.length) {
    query.$or = selectedSizes.map((s) => ({
      [`stock.${s}`]: { $exists: true, $gt: 0 }
    }));
  }
}

    // PRICE
if (priceMin || priceMax) {
  query.price = {};
  if (priceMin !== undefined) query.price.$gte = parseFloat(priceMin);
  if (priceMax !== undefined) query.price.$lte = parseFloat(priceMax);
}
      console.log("FINAL MONGO QUERY2:", query);

    // PAGINATION
    const skip = (page - 1) * limit;

    const products = await Products.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Products.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getAllFilterProducts error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filtered products",
    });
  }
};





 
module.exports = {
    createNewProduct,
    getAllProducts ,
    getSingelProducts,
    updateProductById,
    deleteProductById,
    reduceStock,
    trendingProducts,
    getAllFilters,
    getAllFilterProducts,

 
}





