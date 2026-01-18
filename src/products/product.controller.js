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
     const searchTerm = req.query.search || req.query.query;
    const {
      category,
      color,
      size,
      styleCategory,
      priceMin,
      priceMax,
      page = 1,
      limit = 24,
      search
    } = req.query;

    const conditions = [];

    // ------------------------------
    // SEARCH
    // ------------------------------
    if (searchTerm) {
     const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
     
      const searchRegex = { $regex: escaped, $options: "i" };

      conditions.push({
        $or: [
          { name: searchRegex },
          { category: searchRegex },
          { description: searchRegex },
          { color: searchRegex },
          { productCode: searchRegex }
        ],
      });
    }

    // ------------------------------
    // CATEGORY
    // ------------------------------
    if (category && category !== "all") {
      conditions.push({ category });
    }

    // ------------------------------
    // COLOR
    // ------------------------------
    if (color && color !== "all") {
      conditions.push({ color });
    }

    // ------------------------------
    // STYLE CATEGORY
    // ------------------------------
    if (styleCategory && styleCategory !== "all") {
      conditions.push({ styleCategory });
    }

    // ------------------------------
    // SIZE
    // ------------------------------
    if (size) {
      let selectedSizes = size;

      if (typeof selectedSizes === "string") {
        selectedSizes = selectedSizes.split(",");
      }

      const sizeQueries = selectedSizes.map((s) => ({
        [`stock.${s.trim()}`]: { $exists: true, $gt: 0 },
      }));

      conditions.push({ $or: sizeQueries });
    }

    // ------------------------------
    // PRICE FILTER (min / max)
    // ------------------------------
    if (priceMin || priceMax) {
      const priceFilter = {};

      if (priceMin) priceFilter.$gte = Number(priceMin);
      if (priceMax) priceFilter.$lte = Number(priceMax);

      conditions.push({ price: priceFilter });
    }

    // ------------------------------
    // FINAL FILTER
    // ------------------------------
    const finalFilter =
      conditions.length > 0 ? { $and: conditions } : {};

    // ------------------------------
    // PAGINATION
    // ------------------------------
    const skip = (page - 1) * limit;

    const totalProducts = await Products.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalProducts / Number(limit));

    const products = await Products.find(finalFilter)
      .skip(skip)
      .limit(Number(limit));

// ------------------------------
// 🔥 PRICE RANGES (CATEGORY-BASED ONLY)
// ------------------------------
let priceRanges = [];
        const selectedCategory = category; // Use the parsed category variable

        if (selectedCategory && selectedCategory.toLowerCase() !== "all") {
            console.log(`- Dynamic Price Logic: Category '${selectedCategory}' is active.`);
            
            // Aggregation filter uses case-insensitive match for the category
            const categoryMatch = { category: { $regex: new RegExp(`^${selectedCategory}$`, "i") } };

            const maxPriceResult = await Products.aggregate([
                { $match: categoryMatch },
                { $group: { _id: null, max: { $max: "$price" } } }
            ]);

            const maxPrice = maxPriceResult.length > 0 ? maxPriceResult[0].max : 0;
            const categoryMaxPrice = Math.max(0, maxPrice || 0);
          
            if (categoryMaxPrice > 0) {
                
                // Low Price Range Configuration (for categories like Panjabi)
                if (categoryMaxPrice <= 1500) {
                    console.log("- Using LOW PRICE ranges (e.g., Panjabi)");
                    priceRanges = [
                        { label: `0 - 500`, min: 0, max: 500 },
                        { label: `501 - 800`, min: 501, max: 800 },
                        { label: `801 - ${categoryMaxPrice}`, min: 801, max: categoryMaxPrice },
                    ];
                } 
                // High Price Range Configuration (for categories like Sherwani)
                else {
                    console.log("- Using HIGH PRICE ranges (e.g., Sherwani)");
                    priceRanges = [
                        { label: `0 - 1000`, min: 0, max: 1000 },
                        { label: `1001 - 2500`, min: 1001, max: 2500 },
                        { label: `2501 - ${categoryMaxPrice}`, min: 2501, max: categoryMaxPrice },
                    ];
                }
                
                // Final cleanup: Filter out ranges whose starting point is above the max price
                priceRanges = priceRanges.filter(range => range.min <= categoryMaxPrice);

            } else {
                priceRanges = [];
            }
        } else {
            // GLOBAL fallback (category = all or not selected)
            console.log("- Using GLOBAL PRICE ranges.");
            priceRanges = [
                { label: "0 - 1000", min: 0, max: 1000 },
                { label: "1001 - 3000", min: 1001, max: 3000 },
                { label: "3001 - 5000", min: 3001, max: 5000 },
                { label: "5000+", min: 5000, max: null },
            ];
        }

    // ------------------------------
    // STYLE CATEGORIES
    // ------------------------------
    const styleCategoryMap = {
      panjabi: ["simple", "casual", "embroidered", "gorgeous", "wedding"],
      "kids-panjabi": ["simple", "gorgeous", "embroidered", "party"],
      "big-size": ["simple", "gorgeous", "embroidered"],
      sheroany: ["gorgeous", "simple", "royal", "wedding"],
    };

    const normalizedCategory =
      category?.toLowerCase()?.replace(/\s+/g, "-")?.trim();

    let styleCategories = [];

    for (const [key, list] of Object.entries(styleCategoryMap)) {
      if (normalizedCategory?.includes(key)) {
        styleCategories = list;
        break;
      }
    }

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        products,
        totalProducts,
        totalPages,
        currentPage: Number(page),
        filters: {
          priceRanges,
          styleCategories,
        },
      },
    });
  } catch (error) {
    console.error("getAllProducts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
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

const normalizedCategory = categoryParam?.toLowerCase()?.replace(/\s+/g, "-")?.trim();
    for (const [key, value] of Object.entries(categorySizeMap)) {
      if (normalizedCategory?.includes(key)) {
        sizes = value;
        break;
      }
    }

 
    // ✅ Styles
    const styles = [...new Set(products.map(p => p.style?.toLowerCase()).filter(Boolean))];

  
// Dynamic Price Range Generator
// Prices for this category only
const productPrices = products
  .map((p) => p.price)
  .filter((p) => typeof p === "number" && p > 0);

let calculatedMaxPrice = Math.max(...productPrices);
if (!isFinite(calculatedMaxPrice)) calculatedMaxPrice = 0;

// Base static ranges
let priceRanges = [
  { label: "0 - 500", min: 0, max: 500 },
  { label: "501 - 800", min: 501, max: 800 },
  { label: "801 - 1000", min: 801, max: 1000 },
  { label: "1001 - 1200", min: 1001, max: 1200 },
  { label: "1201 - 1500", min: 1201, max: 1500 },
  { label: "1501 - 2000", min: 1501, max: 2000 },
];

// Filter out ranges that are higher than max price
priceRanges = priceRanges.filter(range => range.min <= calculatedMaxPrice);

// Add final open-ended range if max price exceeds last range
const lastRange = priceRanges[priceRanges.length - 1];
if (!lastRange || lastRange.max < calculatedMaxPrice) {
  priceRanges.push({
    label: `${calculatedMaxPrice}+`,
    min: calculatedMaxPrice,
    max: null,
  });
}

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





