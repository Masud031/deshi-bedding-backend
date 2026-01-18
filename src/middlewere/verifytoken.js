const { errorResponse } = require("../user/responsHandler");
const jwt =  require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken=(req, res, next)=>{
    try {
       // 1️⃣ Check cookie first
<<<<<<< HEAD
   const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    // 2️⃣ If not in cookie, check Authorization header
    // if (!token && req.headers.authorization) {
    //   token = req.headers.authorization.split(" ")[1];
    // }
=======
    let token = req.cookies?.token;

    // 2️⃣ If not in cookie, check Authorization header
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }
>>>>>>> 237ed83c4a02dbd63e6b822971dac475e664069f

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
        
<<<<<<< HEAD
   } catch (error) {
        console.error("JWT Verification Error:", error.message); // 👈 ADD THIS TO SEE SERVER LOGS
        return errorResponse(res, 401, "Invalid or Expired Token!"); 
    }

}
module.exports =verifyToken;
=======
    } catch (error) {
        errorResponse(res, 500, "Invalid Token!", error); 
    }

}
module.exports =verifyToken;
>>>>>>> 237ed83c4a02dbd63e6b822971dac475e664069f
