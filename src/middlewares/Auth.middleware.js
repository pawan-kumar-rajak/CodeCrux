import { ApiError } from "../utils/ApiError.js";

import jwt from "jsonwebtoken";
import { Resident } from "../models/resident.model.js";
import { Admin } from "../models/admin.model.js";
import { Collector } from "../models/collector.model.js";
import { Vendor } from "../models/vendor.model.js";

export const verifyJWT = async (req, _, next) => {
	try {
		const token =
			req.cookies?.accessToken ||
			req.header("Authorization")?.replace("Bearer ", "");
		// let token;
		// const authHeader = req.headers.authorization;
		// if (authHeader && authHeader.startsWith("Bearer ")) {
		// 	token = authHeader.split(" ")[1];
		// 	// console.log("everything fine here");
		// 	// Use this token for verification
		// } else {
		// 	return next( new ApiError("Token missing or malformed"));


		// }
		// console.log(token);
		if (!token) {
			return next( new ApiError(401, "Unauthorized request"));
		}

		const decodedToken = jwt.verify(
			token,
			process.env.ACCESS_TOKEN_SECRET
		);

		// Determine the user model to query based on the role
		let user, role;

		switch (decodedToken.role) {
			case "collector": { // Seller / Artisan role
				user = await Collector.findById(
					decodedToken._id
				).select("-password -refreshToken");

				role = "collector"
				break;
			}
			case "resident": { // Customer role
				user = await Resident.findById(
					decodedToken._id
				).select("-password -refreshToken");

				role = "resident"
				break;
			}
			case "Admin": {
				user = await Admin.findById(
					decodedToken._id
				).select("-password -refreshToken");
				role = "Admin"

				break;

			}
			case "vendor": {
				user = await Vendor.findById(
					decodedToken._id
				).select("-password -refreshToken");
				role = "vendor"

				break;

			}

			default:
				return next( new ApiError(401, "Invalid role in token"));
		}

		if (!user) {
			return next( new ApiError(401, "Invalid Access Token"));
		}

		req.user = user;
		req.role = role;
		// console.log("user logged out successfully");
		next();
	} catch (error) {
		return next(new ApiError(
			401,
			error?.message || "Invalid access token"
		))
	}
}




// Middleware to check if the user is a seller
export const isCollector =
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Collector.findById(userId);

			if (!user) {
				return next(new ApiError(401,
					"Unauthorized request for Collector"
				));
			}


			next();
		} catch (error) {
			console.error(error);
			return next(new ApiError(500,
				"Server is not responding please try again later !"
			));
		}
	}


export const isResident =
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Resident.findById(userId);

			if (!user) {
				return next(new ApiError(401,
					"Unauthorized request for Resident"
				));
			}



			next();
		} catch (error) {
			console.error(error);
			return next(new ApiError(500,
				"Server is not responding please try again later !"
			));
		}
	}



export const isVendor =
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Vendor.findById(userId);

			if (!user) {
				return next(new ApiError(401,
					"Unauthorized request for Vendor"
				));
			}



			next();
		} catch (error) {
			console.error(error);
			return next(new ApiError(500,
				"Server is not responding please try again later !"
			));
		}
	}
