import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Resident } from "../models/resident.model.js";
import { Admin } from "../models/admin.model.js";
import {Collector} from "../models/collector.model.js";

export const verifyJWT = asyncHandler(
	async (req, _, next) => {
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
			// 	throw new Error("Token missing or malformed");
			// }
			// console.log(token);
			if (!token) {
				throw new ApiError(401, "Unauthorized request");
			}

			const decodedToken = jwt.verify(
				token,
				process.env.ACCESS_TOKEN_SECRET
			);

			// Determine the user model to query based on the role
			let user,role;
			
			switch (decodedToken.role) {
				case "artisan":{ // Seller / Artisan role
					user = await Artisan.findById(
						decodedToken._id
					).select("-password -refreshToken");

					role = "Artisan"
					break;
				}
				case "customer":{ // Customer role
					user = await Customer.findById(
						decodedToken._id
					).select("-password -refreshToken");

					role = "Customer"
					break;
				}
				case "Admin":{
					user = await Admin.findById(
						decodedToken._id
					).select("-password -refreshToken");
					role= "Admin"
					
					break;

				}

				case "logisticAgent":{
					user = await Agent.findById(
						decodedToken._id
					).select("-password -refreshToken");
					role= "logisticAgent"
					
					break;

				}
				default:
					throw new ApiError(401, "Invalid role in token");
			}

			if (!user) {
				throw new ApiError(401, "Invalid Access Token");
			}

			req.user = user;
			req.role = role;
			// console.log("user logged out successfully");
			next();
		} catch (error) {
			throw new ApiError(
				401,
				error?.message || "Invalid access token"
			);
		}
	}
);


export const verifyJWTtemp = asyncHandler(async (req, _, next) => {
	try {
		const token =
			req.cookies?.accessToken ||
			req.header("Authorization")?.replace("Bearer ", "");

		if (!token) {
			// No token found, continue without user context
			req.user = null;
			req.role = null;
			return next();
		}

		const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

		// Determine the user model to query based on the role
		let user, role;

		switch (decodedToken.role) {
			case "artisan":
				user = await Artisan.findById(decodedToken._id).select(
					"-password -refreshToken"
				);
				role = "Artisan";
				break;
			case "customer":
				user = await Customer.findById(decodedToken._id).select(
					"-password -refreshToken"
				);
				role = "Customer";
				break;
			case "Admin":
				user = await Admin.findById(decodedToken._id).select(
					"-password -refreshToken"
				);
				role = "Admin";
				break;
			case "logisticAgent":
				user = await Agent.findById(decodedToken._id).select(
					"-password -refreshToken"
				);
				role = "logisticAgent";
				break;
			default:
				throw new ApiError(401, "Invalid role in token");
		}

		if (!user) {
			throw new ApiError(401, "Invalid Access Token");
		}

		req.user = user;
		req.role = role;
		next();
	} catch (error) {
		// If token is invalid, continue without user context
		req.user = null;
		req.role = null;
		next();
	}
});


// Middleware to check if the user is a seller
export const isSeller = asyncHandler(
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Artisan.findById(userId);

			if (!user) {
				throw new ApiError(
					401,
					"Unauthorized request for Artisan"
				);
			}

			//* Artisan is verified or not check
			// if (!user.isVerified) {
			//     throw new ApiError(403, "Seller is not verfied")        }

			next();
		} catch (error) {
			console.error(error);
			throw new ApiError(
				500,
				"Server is not responding please try again later !"
			);
		}
	}
);

export const isCustomer = asyncHandler(
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Customer.findById(userId);

			if (!user) {
				throw new ApiError(
					401,
					"Unauthorized request for Customer"
				);
			}

			//* Artisan is verified or not check
			// if (!user.isVerified) {
			//     throw new ApiError(403, "Seller is not verfied")        }

			next();
		} catch (error) {
			console.error(error);
			throw new ApiError(
				500,
				"Server is not responding please try again later !"
			);
		}
	}
);


export const isAgent = asyncHandler(
	async (req, res, next) => {
		try {
			// Assuming req.user is populated with the authenticated user
			const userId = req.user._id;
			const user = await Agent.findById(userId);

			if (!user) {
				throw new ApiError(
					401,
					"Unauthorized request for Customer"
				);
			}

			//* Artisan is verified or not check
			// if (!user.isVerified) {
			//     throw new ApiError(403, "Seller is not verfied")        }

			next();
		} catch (error) {
			console.error(error);
			throw new ApiError(
				500,
				"Server is not responding please try again later !"
			);
		}
	}
);
