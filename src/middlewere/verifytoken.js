const { errorResponse } = require("../user/responsHandler");
const jwt =  require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken=(req, res, next)=>{
    try {
       // 1️⃣ Check cookie first
    let token = req.cookies?.token;

    // 2️⃣ If not in cookie, check Authorization header
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, 401, "Unauthorized Access!");
    }
        const decoded = jwt.verify(token,  JWT_SECRET);
        if(!decoded.userId) {
            return res.status(403).send({message: "Access denied!"})
        }
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
        
    } catch (error) {
        errorResponse(res, 500, "Invalid Token!", error); 
    }

}
module.exports =verifyToken;
