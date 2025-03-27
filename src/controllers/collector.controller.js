// collector.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { Collector, Collector as User } from "../models/collector.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
// import { WasteReport } from "../models/WasteReport.model.js";
import { Resident } from "../models/resident.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { parseCoordinates } from "../utils/location_handling.js";
import { WasteReport } from "../models/wasteReport.model.js";


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

const registerCollector = asyncHandler(async (req, res, next) => {
	let session;
	try {
		// Start session for transaction handling
		session = await mongoose.startSession();
		session.startTransaction();

		// Extract fields from the request body
		const { employeeId, fullName, email, password, assignedZone, currentLocation } = req.body;

		// Validate required fields
		if (!employeeId || !fullName || !email || !password || !assignedZone || !currentLocation) {
			return next(new ApiError(400, "All required fields must be provided"));
		}

		// Check if the collector already exists by email or employeeId
		const existingCollector = await Collector.findOne({ $or: [{ email }, { employeeId }] });
		if (existingCollector) {
			return next(new ApiError(409, "Collector with this email or employee ID already exists"));
		}

		// Process coordinates for currentLocation
		const parsedCoordinates = parseCoordinates(currentLocation.coordinates);
		if (!parsedCoordinates) {
			return next(new ApiError(400, "Invalid coordinates for current location"));
		}

		// Create a new collector document
		const collector = await Collector.create(
			[{
				employeeId,
				fullName,
				email,
				password,
				assignedZone,
				role: "collector",  // Default role for collector
				currentLocation: { 
					type: "Point", 
					coordinates: parsedCoordinates 
				}
			}],
			{ session }
		);

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		// Retrieve the created collector to return with the response
		const createdCollector = await Collector.findById(collector[0]._id);

		// Check if collector creation was successful
		if (!createdCollector) {
			return next(new ApiError(500, "Something went wrong while registering the collector"));
		}

		// Generate access and refresh tokens for the collector (if needed)
		const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(createdCollector._id);

		// Send success response
		return res.status(201).json(
			new ApiResponse(200, { createdCollector, accessToken, refreshToken }, "Collector registered successfully")
		);

	} catch (error) {
		// If an error occurs, abort the transaction and end session
		if (session) {
			await session.abortTransaction();
			session.endSession();
		}
		console.error("Error during transaction: ", error);
		return next(new ApiError(500, "Something went wrong while registering the collector"));
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

// Update collector's current location
const updateLocation = async (req, res, next) => {
    try {
        const { coordinates } = req.body;
        
        await Collector.findByIdAndUpdate(req.user._id, {
            currentLocation: {
                type: 'Point',
                coordinates: coordinates
            }
        });

        res.status(200).json(new ApiResponse(200, null, 'Location updated successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error updating location'));
    }
};

// Get assigned pickups
const getAssignedPickups = async (req, res, next) => {
    try {
        const collector = await Collector.findById(req.user._id)
            .populate({
                path: 'assignedPickups',
                populate: [
                    { path: 'wasteReport', populate: { path: 'reportedBy', select: 'fullName phoneNo' } },
                    { path: 'vendor', select: 'companyName processingFacilityLocation' }
                ]
            });

        res.status(200).json(new ApiResponse(200, collector.assignedPickups, 'Assigned pickups fetched successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching assigned pickups'));
    }
};

// Mark pickup as collected
const markAsCollected = async (req, res, next) => {
    try {
        const { requestId, currentLocation } = req.body;
        
        const request = await WasteProcessingRequest.findById(requestId)
            .populate('wasteReport')
            .populate('vendor');

        if (!request) {
            return next(new ApiError(404, 'Request not found'));
        }

        // Check proximity to pickup location (50 meters)
        const distance = calculateDistance(
            currentLocation,
            request.wasteReport.coordinates.coordinates
        );

        if (distance > 50) {
            return next(new ApiError(400, 'You must be within 50 meters to mark as collected'));
        }

        // Update waste report status
        await WasteReport.findByIdAndUpdate(request.wasteReport._id, {
            status: 'collector_assigned'
        });

        res.status(200).json(new ApiResponse(200, null, 'Pickup marked as collected successfully'));
    } catch (error) {
        console.log("error while marking as collected", error);
        next(new ApiError(500, 'Error marking pickup as collected'));
    }
};

// Mark delivery as completed
const markAsDelivered = async (req, res, next) => {
    try {
        const { requestId, currentLocation } = req.body;
        
        const request = await WasteProcessingRequest.findById(requestId)
            .populate('wasteReport')
            .populate('vendor');

        if (!request) {
            return next(new ApiError(404, 'Request not found'));
        }

        // Check proximity to vendor location (50 meters)
        const distance = calculateDistance(
            currentLocation,
            request.vendor.processingFacilityLocation.coordinates
        );

        if (distance > 50) {
            return next(new ApiError(400, 'You must be within 50 meters of the vendor facility to mark as delivered'));
        }

        // Update request status
        await WasteProcessingRequest.findByIdAndUpdate(requestId, {
            status: 'completed'
        });

        // Calculate and update resident rewards
        const reward = calculateReward(
            request.wasteReport.approximateWeight,
            request.wasteReport.status === 'useful'
        );

        await Resident.findByIdAndUpdate(request.wasteReport.reportedBy, {
            $inc: { rewardCoins: reward }
        });

        res.status(200).json(new ApiResponse(200, { reward }, 'Delivery marked as completed successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error marking delivery as completed'));
    }
};

// Get collector dashboard stats
const getCollectorDashboard = async (req, res, next) => {
    try {
        const collector = await Collector.findById(req.user._id)
            .populate('assignedPickups');

        const totalAssigned = collector.assignedPickups.length;
        const pendingPickups = collector.assignedPickups.filter(p => p.status === 'pending_vendor').length;
        const completedPickups = collector.assignedPickups.filter(p => p.status === 'completed').length;

        const dashboardData = {
            totalAssigned,
            pendingPickups,
            completedPickups,
            recentPickups: collector.assignedPickups.slice(0, 5)
        };

        res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard data fetched successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching collector dashboard'));
    }
};

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Helper function to calculate rewards
function calculateReward(weight, isUseful) {
    const W = 10; // Base reward for non-useful waste
    const N = 15; // Base reward for useful waste
    return Math.floor(isUseful ? N * weight : W * weight);
}

export{
    registerCollector,
    loginUser,
    logoutUser,
    refreshAccessToken,

    updateLocation,
    getAssignedPickups,
    markAsCollected,
    markAsDelivered,
    getCollectorDashboard
};