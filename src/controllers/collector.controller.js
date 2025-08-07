// collector.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { Collector, Collector as User } from "../models/collector.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { Resident } from "../models/resident.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
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

    const { email,password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "Collector does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(
        password
    );

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
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
                "Collector logged in successfully"
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
const updateLocation = asyncHandler(async (req, res) => {
    const { coordinates } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        throw new ApiError(400, "Invalid coordinates format. Expected [longitude, latitude]");
    }

    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        throw new ApiError(400, "Invalid coordinates values");
    }

    await Collector.findByIdAndUpdate(req.user._id, {
        currentLocation: {
            type: 'Point',
            coordinates: coordinates
        }
    }, { new: true });

    return res.status(200).json(
        new ApiResponse(200, { coordinates }, 'Location updated successfully')
    );
});

// Get assigned pickups
const getAssignedPickups = asyncHandler(async (req, res) => {
    const collector = await Collector.findById(req.user._id)
        .populate({
            path: 'assignedPickups',
            populate: [
                { 
                    path: 'wasteReport', 
                    populate: { 
                        path: 'reportedBy', 
                        select: 'fullName phoneNo coordinates address' 
                    } 
                },
                { 
                    path: 'vendor', 
                    select: 'companyName processingFacilityLocation address' 
                }
            ]
        })
        .lean();

    if (!collector) {
        throw new ApiError(404, "Collector not found");
    }

    const formattedPickups = collector.assignedPickups.map(pickup => ({
        id: pickup._id,
        status: pickup.status,
        wasteReport: pickup.wasteReport ? {
            id: pickup.wasteReport._id,
            type: pickup.wasteReport.mlIdentifiedType,
            weight: pickup.wasteReport.approximateWeight,
            reporter: {
                name: pickup.wasteReport.reportedBy.fullName,
                phone: pickup.wasteReport.reportedBy.phoneNo,
                address: pickup.wasteReport.reportedBy.address
            },
            location: pickup.wasteReport.coordinates
        } : null,
        vendor: pickup.vendor ? {
            name: pickup.vendor.companyName,
            facility: pickup.vendor.processingFacilityLocation,
            address: pickup.vendor.address
        } : null,
        createdAt: pickup.createdAt
    }));

    return res.status(200).json(
        new ApiResponse(200, formattedPickups, 'Assigned pickups fetched successfully')
    );
});

// Mark pickup as collected
const markAsCollected = asyncHandler(async (req, res) => {
    const { requestId, currentLocation } = req.body;

    if (!requestId || !currentLocation || !Array.isArray(currentLocation) || currentLocation.length !== 2) {
        throw new ApiError(400, "Invalid request parameters");
    }

    const request = await WasteProcessingRequest.findById(requestId)
        .populate('wasteReport')
        .populate('vendor');

    if (!request) {
        throw new ApiError(404, 'Request not found');
    }

    if (!request.wasteReport) {
        throw new ApiError(404, 'Associated waste report not found');
    }

    // Validate collector assignment
    if (request.collector.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Not authorized to collect this pickup');
    }

    // Check proximity to pickup location (50 meters)
    const distance = calculateDistance(
        currentLocation,
        request.wasteReport.coordinates.coordinates
    );

    if (distance > 50) {
        throw new ApiError(400, 'You must be within 50 meters to mark as collected');
    }

    // Update waste report status and add collection timestamp
    const updatedWasteReport = await WasteReport.findByIdAndUpdate(
        request.wasteReport._id,
        {
            status: 'in_transit',
            collectionTimestamp: new Date(),
            collectedBy: req.user._id
        },
        { new: true }
    );

    // Update request status
    await WasteProcessingRequest.findByIdAndUpdate(
        requestId,
        {
            status: 'in_transit',
            collectionDetails: {
                timestamp: new Date(),
                location: {
                    type: 'Point',
                    coordinates: currentLocation
                }
            }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, 
            { 
                wasteReport: updatedWasteReport,
                nextDestination: request.vendor?.processingFacilityLocation
            }, 
            'Pickup marked as collected successfully'
        )
    );
});

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
            .populate('assignedPickups')
            .populate({
                path: 'assignedPickups',
                match: { status: { $nin: ['completed', 'cancelled'] } }, // Filter at query level
                populate: [
                    {
                        path: 'wasteReport',
                        match: { status: { $nin: ['unidentified', 'pending'] } },
                        populate: {
                            path: 'reportedBy',
                            select: 'fullName phoneNo'
                        }
                    },
                    {
                        path: 'vendor',
                        select: 'companyName processingFacilityLocation'
                    }
                ]
            })
            .lean();

        const totalAssigned = collector.assignedPickups.length;
        const pendingPickups = collector.assignedPickups.filter(p => p.status === 'pending_vendor').length;
        const completedPickups = collector.assignedPickups.filter(p => p.status === 'completed').length;

        const dashboardData = {
            totalAssigned,
            pendingPickups,
            completedPickups,
            recentPickups: collector.assignedPickups.slice(0, 15)
        };

        res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard data fetched successfully'));
    } catch (error) {
        console.log("error: ", error)
        next(new ApiError(500, 'Error fetching collector dashboard'));
    }
};

// get all pending pickups
const getPendingPickupsWithDropoff = async (req, res, next) => {
    try {
        // Constants (could be moved to config/environment variables)
        const DEFAULT_LANDFILL = {
            name: "Landfill 1",
            coordinates: [75.8169, 26.8365] // [longitude, latitude]
        };

        // Validate user ID
        if (!req.user?._id) {
            throw new ApiError(400, 'User ID is required');
        }

        // Fetch collector with populated data
        const collector = await Collector.findById(req.user._id)
            .populate({
                path: 'assignedPickups',
                match: { status: { $nin: ['completed', 'cancelled'] } }, // Filter at query level
                populate: [
                    {
                        path: 'wasteReport',
                        match: { status: { $nin: ['unidentified', 'pending'] } },
                        populate: {
                            path: 'reportedBy',
                            select: 'fullName phoneNo'
                        }
                    },
                    {
                        path: 'vendor',
                        select: 'companyName processingFacilityLocation'
                    }
                ]
            })
            .lean(); // Convert to plain JS object for better performance

        if (!collector) {
            throw new ApiError(404, 'Collector not found');
        }

        // Process pickups
        const processedPickups = collector.assignedPickups
            .filter(pickup => pickup.wasteReport) // Ensure wasteReport exists after population
            .map(pickup => {
                // Determine dropoff location
                const dropoffLocation = pickup.status === "accepted" && pickup.vendor
                    ? {
                        name: pickup.vendor.companyName,
                        coordinates: pickup.vendor.processingFacilityLocation?.coordinates || DEFAULT_LANDFILL.coordinates
                    }
                    : DEFAULT_LANDFILL;

                return {
                    pickupId: pickup._id,
                    status: pickup.status,
                    wasteReport: {
                        ...pickup.wasteReport,
                        reporter: pickup.wasteReport.reportedBy // Rename for clarity
                    },
                    dropoffLocation,
                    pickupLocation: pickup.wasteReport?.location // Assuming wasteReport has location
                };
            });

        res.status(200).json(
            new ApiResponse(200, processedPickups, 'Pickups with dropoff locations fetched successfully')
        );

    } catch (error) {
        // Pass along existing ApiError or create new one
        next(error instanceof ApiError ? error :
            new ApiError(500, 'Error fetching pickups with dropoff locations'));
    }
};
// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;

    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Helper function to calculate rewards
function calculateReward(weight, isUseful) {
    const W = 10; // Base reward for non-useful waste
    const N = 15; // Base reward for useful waste
    return Math.floor(isUseful ? N * weight : W * weight);
}


// controllers/wasteController.js
const getWasteDetails = async (req, res, next) => {
    try {
        const { wasteId } = req.params;

        // Find the waste report and populate basic resident info
        const wasteReport = await WasteReport.findById(wasteId)
            .populate('reportedBy', 'fullName phoneNo address')
            .lean();

        if (!wasteReport) {
            throw new ApiError(404, 'Waste report not found');
        }

        // Find processing requests for this waste report
        const processingRequests = await WasteProcessingRequest.find({ wasteReport: wasteId })
            .populate('vendor', 'companyName processingFacilityLocation address')
            .populate('collector', 'name vehicleNumber')
            .sort({ createdAt: -1 }) // Sort by newest first
            .lean();

        // Corrected version
        const activeRequest = processingRequests.find(req =>
            ['pending_vendor', 'accepted'].includes(req.status)
        ) || (processingRequests.length > 0 ? processingRequests[0] : null);

        // Prepare the response data
        const responseData = {
            wasteReport: {
                _id: wasteReport._id,
                wasteType: {
                    userReported: wasteReport.userReportedType,
                    mlIdentified: wasteReport.mlIdentifiedType,
                    mlDetails: wasteReport.mlDetails
                },
                weight: wasteReport.approximateWeight,
                status: wasteReport.status,
                location: {
                    coordinates: wasteReport.coordinates.coordinates,
                    address: wasteReport.address,
                    zone: wasteReport.assignedZone
                },
                images: wasteReport.photoUrl,
                createdAt: wasteReport.createdAt
            },
            resident: {
                name: wasteReport.reportedBy.fullName,
                contact: wasteReport.reportedBy.phoneNo,
                address: wasteReport.reportedBy.address
            },
            currentProcessing: activeRequest ? {
                _id: activeRequest._id,
                status: activeRequest.status,
                vendor: activeRequest.vendor ? {
                    _id: activeRequest.vendor._id,
                    companyName: activeRequest.vendor.companyName,
                    address: activeRequest.vendor.address,
                    processingFacilityLocation: activeRequest.vendor.processingFacilityLocation.coordinates
                } : null,
                collector: activeRequest.collector || null,
                createdAt: activeRequest.createdAt
            } : null,
            processingHistory: processingRequests.map(req => ({
                _id: req._id,
                status: req.status,
                vendor: req.vendor ? {
                    companyName: req.vendor.companyName,
                    location: req.vendor.processingFacilityLocation.coordinates
                } : null,
                collector: req.collector ? {
                    name: req.collector.name,
                    vehicle: req.collector.vehicleNumber
                } : null,
                date: req.createdAt
            }))
        };

        return res.status(200)
            .json(new ApiResponse(200, responseData, 'Waste details fetched successfully'));

    } catch (error) {
        console.log("error:", error)
        next(new ApiError(
            error.statusCode || 500,
            error.message || 'Error fetching waste details'
        ));
    }
};


export {
    registerCollector,
    loginUser,
    logoutUser,
    refreshAccessToken,

    updateLocation,
    getAssignedPickups,
    markAsCollected,
    markAsDelivered,
    getCollectorDashboard,
    getPendingPickupsWithDropoff,
    getWasteDetails,
};