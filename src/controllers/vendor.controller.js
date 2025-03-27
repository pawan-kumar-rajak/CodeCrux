import { Vendor, Vendor as User } from "../models/vendor.model.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { Collector } from "../models/collector.model.js";
// import { WasteReport } from "../models/wasteReport.model.js";   
import mongoose from "mongoose";
import { parseCoordinates } from "../utils/location_handling.js";


const generateAccessAndRefereshTokens = async (userId) => {
    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();


        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token"
        );
    }
};

const registerVendor = asyncHandler(async (req, res, next) => {
	let session;
	try {
		// Start session for transaction handling
		session = await mongoose.startSession();
		session.startTransaction();

		// Extract fields from the request body
		const { 
			companyName, 
			licenseNo, 
			address, 
			requiredWasteTypes, 
			email, 
			password, 
			processingMethod, 
			avatar, 
			energyProduced, 
			co2Reduced, 
			wasteProcessed, 
			certifications, 
			processingFacilityLocation 
		} = req.body;

		// Validate required fields
		if (!companyName || !licenseNo || !address || !requiredWasteTypes || !email || !password || !processingFacilityLocation) {
			return next(new ApiError(400, "All required fields must be provided"));
		}

		// Check if the vendor already exists by email or license number
		const existingVendor = await Vendor.findOne({ $or: [{ email }, { licenseNo }] });
		if (existingVendor) {
			return next(new ApiError(409, "Vendor with this email or license number already exists"));
		}

		// Process coordinates for processing facility location
		const parsedCoordinates = parseCoordinates(processingFacilityLocation.coordinates);
		if (!parsedCoordinates) {
			return next(new ApiError(400, "Invalid coordinates for processing facility"));
		}

		// Create a new vendor document
		const vendor = await Vendor.create(
			[{
				companyName,
				licenseNo,
				address,
				requiredWasteTypes,
				email,
				password,
				processingMethod,
				avatar: avatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png", // default avatar
				energyProduced: energyProduced || 0,
				co2Reduced: co2Reduced || 0,
				wasteProcessed: wasteProcessed || 0,
				certifications: certifications || [],
				processingFacilityLocation: { 
					type: "Point", 
					coordinates: parsedCoordinates 
				}
			}],
			{ session }
		);

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		// Retrieve the created vendor to return with the response
		const createdVendor = await Vendor.findById(vendor[0]._id);

		// Check if vendor creation was successful
		if (!createdVendor) {
			return next(new ApiError(500, "Something went wrong while registering the vendor"));
		}

		// Generate access and refresh tokens for the vendor (if needed)
		const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(createdVendor._id);

		// Send success response
		return res.status(201).json(
			new ApiResponse(200, { createdVendor, accessToken, refreshToken }, "Vendor registered successfully")
		);

	} catch (error) {
		// If an error occurs, abort the transaction and end session
		if (session) {
			await session.abortTransaction();
			session.endSession();
		}
		console.error("Error during transaction: ", error);
		return next(new ApiError(500, "Something went wrong while registering the vendor"));
	}
});



const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body;
    console.log(email);

    // if (!username && !email) {
    //     throw new ApiError(400, "username or email is required")
    // }

    // Here is an alternative of above code based on logic discussed in video:
    if (!(username || email)) {
        throw new ApiError(
            400,
            "username or email is required"
        );
    }

    const user = await User.findOne({ email});

    if (!user) {
        throw new ApiError(404, "Admin does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(
        password
    );

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Admin credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "Admin logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(
    async (req, res) => {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized request");
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken?._id);

            if (!user) {
                throw new ApiError(401, "Invalid refresh token");
            }

            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(
                    401,
                    "Refresh token is expired or used"
                );
            }

            const options = {
                httpOnly: true,
                secure: true,
            };

            const { accessToken, newRefreshToken } =
                await generateAccessAndRefereshTokens(user._id);

            return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        200,
                        { accessToken, refreshToken: newRefreshToken },
                        "Access token refreshed"
                    )
                );
        } catch (error) {
            throw new ApiError(
                401,
                error?.message || "Invalid refresh token"
            );
        }
    }
);

// Get available waste reports matching vendor's requirements
const getAvailableWaste = async (req, res, next) => {
    try {
        // Get vendor with their processing facility location
        const vendor = await Vendor.findById(req.user._id);
        
        if (!vendor || !vendor.processingFacilityLocation) {
            return next(new ApiError(404, 'Vendor or processing facility location not found'));
        }

        // Find waste reports that:
        // 1. Are marked as 'useful'
        // 2. Match vendor's required waste types
        // 3. Are within 10 km of vendor's processing facility
        const reports = await WasteReport.find({
            status: 'useful',
            userReportedType: { $in: vendor.requiredWasteTypes },
            coordinates: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: vendor.processingFacilityLocation.coordinates
                    },
                    $maxDistance: 100000 // 10 km in meters
                }
            }
        }).populate('reportedBy', 'fullName phoneNo');

        res.status(200).json(new ApiResponse(200, reports, 'Available waste reports fetched successfully'));
    } catch (error) {
        console.error('Error in getAvailableWaste:', error);
        next(new ApiError(500, 'Error fetching available waste reports'));
    }
};

// Request waste collection
const requestWasteCollection = async (req, res, next) => {
    try {
        const { reportId } = req.body;
        
        // Check if report exists and is useful
        const report = await WasteReport.findById(reportId);
        if (!report || report.status !== 'useful') {
            return next(new ApiError(400, 'Invalid waste report or not useful'));
        }

        // Create processing request
        const newRequest = await WasteProcessingRequest.create({
            wasteReport: reportId,
            vendor: req.user._id,
            status: 'pending_vendor'
        });

        // Assign to nearest collector (simplified)
        // In real implementation, you would query collectors near the report location
        const collector = await Collector.findOneAndUpdate(
            { assignedZone: report.assignedZone },
            { $push: { assignedPickups: newRequest._id } },
            { new: true }
        );

        if (!collector) {
            return next(new ApiError(404, 'No collector available in this zone'));
        }

        // Update request with collector
        await WasteProcessingRequest.findByIdAndUpdate(newRequest._id, {
            collector: collector._id
        });

        res.status(201).json(new ApiResponse(201, newRequest, 'Waste collection requested successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error requesting waste collection'));
    }
};

// Get vendor dashboard stats
const getVendorDashboard = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.user._id);
        
        const requests = await WasteProcessingRequest.find({ vendor: req.user._id });
        
        const totalRequests = requests.length;
        const pendingRequests = requests.filter(r => r.status === 'pending_vendor').length;
        const completedRequests = requests.filter(r => r.status === 'completed').length;

        const dashboardData = {
            totalRequests,
            pendingRequests,
            completedRequests,
            wasteProcessed: vendor.wasteProcessed,
            energyProduced: vendor.energyProduced,
            co2Reduced: vendor.co2Reduced,
            recentRequests: requests.slice(0, 5)
        };

        res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard data fetched successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching vendor dashboard'));
    }
};

// Reject waste request
const rejectWasteRequest = async (req, res, next) => {
    try {
        const { requestId } = req.body;
        
        const request = await WasteProcessingRequest.findByIdAndUpdate(requestId, {
            status: 'rejected'
        }, { new: true });

        if (!request) {
            return next(new ApiError(404, 'Request not found'));
        }

        // Update waste report status to be handled by admin
        await WasteReport.findByIdAndUpdate(request.wasteReport, {
            status: 'unidentified'
        });

        res.status(200).json(new ApiResponse(200, null, 'Waste request rejected successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error rejecting waste request'));
    }
};

export{
    registerVendor,
    loginUser,
    logoutUser,
    refreshAccessToken,

    getAvailableWaste,
    requestWasteCollection,
    getVendorDashboard,
    rejectWasteRequest
};