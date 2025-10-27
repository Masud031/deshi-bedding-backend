const User = require ("../user/user.model");
const jwt = require("jsonwebtoken");

const JWT_SECRET =  process.env.JWT_SECRET_KEY

const generateToken = async (userId) => {
  try {

       const JWT_SECRET = process.env.JWT_SECRET_KEY; // move inside function!
    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET_KEY is missing in environment variables!");
      throw new Error("JWT_SECRET_KEY not defined");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const token = jwt.sign({userId:user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    return token;
  } catch (error) {
    console.error("Error generating token", error);
    throw error;
  }
};

module.exports = generateToken;


