import {ApiError} from "../utils/ApiError.js" 
import { Admin } from "../models/admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Middleware to check if the user is an admin
export const isAdmin = asyncHandler( async (req, res, next) => {
  const user = req.user; // Assuming `req.user` is populated by JWT middleware with user data

  if (!user) {
    return next(new ApiError(401, 'User not authenticated.'));
  }

  console.log("user_id admin : ", user)
  try {
    // Check if the user exists in the Admin collection
    const admin = await Admin.findById(user._id); 
    if (!admin) {
      return next(new ApiError(403, 'Access denied. Admins only.'));
    }

    // User is an admin, proceed to next middleware/handler
    next();
  } catch (error) {
    return next(new ApiError(500, 'Internal server error while checking admin status.'));
  }
});


