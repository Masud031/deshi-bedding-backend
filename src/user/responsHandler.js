 const successResponse =(res,statusCode,message, data={})=>{
    res.status(statusCode).send({
     success:true,
     statusCode,
     message,
     data,
 }) 
 }
  const errorResponse =(res,statusCode,message,error=null)=>{
  res.status(statusCode).send({
         success:false,
         statusCode,
         message,
         error: error? error.message : null,
     })
 }; 
 
 module.exports={successResponse, errorResponse};
 
 