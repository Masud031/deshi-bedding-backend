const { errorResponse } = require("../user/responsHandler");
const jwt =  require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET_KEY;


const verifyToken=(req, res, next)=>{
    try {
       // 1️⃣ Check cookie first
   const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    // 2️⃣ If not in cookie, check Authorization header
    // if (!token && req.headers.authorization) {
    //   token = req.headers.authorization.split(" ")[1];
    // }

    if (!token) {
      return errorResponse(res, 401, "Unauthorized Access!");
    }
        const decoded = jwt.verify(token,  JWT_SECRET);
        console.log("Decoded Token:", decoded);
        if(!decoded.userId) {
            return res.status(403).send({message: "Access denied!"})
        }
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
        
   } catch (error) {
        console.error("JWT Verification Error:", error.message); // 👈 ADD THIS TO SEE SERVER LOGS
        return errorResponse(res, 401, "Invalid or Expired Token!"); 
    }

}
module.exports =verifyToken;
