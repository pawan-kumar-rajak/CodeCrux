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
import { Bin } from "../models/bin.model.js";
import { Vendor } from "../models/vendor.model.js";

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
        if (!parsedCoordinates || parsedCoordinates.length !== 2) {
            return next(new ApiError(400, "Invalid coordinates format for current location. Expected [longitude, latitude]"));
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
        return next(new ApiError(500, "Something went wrong while registering the collector: " + error.message));
    }
});


const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body; // Removed username as it's not in collector model
    if (!email || !password) {
        return next(new ApiError(400, "Email and password are required"));
    }

    const user = await User.findOne({ email });
    if (!user) {
        return next(new ApiError(404, "Collector does not exist"));
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return next(new ApiError(401, "Invalid credentials"));
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

const logoutUser = asyncHandler(async (req, res, next) => {
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
    async (req, res, next) => {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            return next(new ApiError(401, "unauthorized request"));
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken?._id);

            if (!user) {
                return next(new ApiError(401, "Invalid refresh token"));
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
const updateLocation = asyncHandler(async (req, res, next) => {
    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        return next(new ApiError(400, "Invalid coordinates format. Expected [longitude, latitude]"));
    }

    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        return next(new ApiError(400, "Invalid coordinates values"));
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
const getAssignedPickups = asyncHandler(async (req, res, next) => {
    const collector = await Collector.findById(req.user._id)
        .populate({
            path: 'assignedPickups', // These are WasteProcessingRequests
            match: { status: { $in: ['collector_assigned', 'collected_from_bin'] } }, // Pickups assigned to collector or collected but not delivered
            populate: [
                {
                    path: 'bin', // Populate the Bin details
                    populate: {
                        path: 'assignedReports', // Get some reports from the bin to show details
                        select: 'userReportedType approximateWeight coordinates reportedBy photoUrl mlIdentifiedType status',
                        populate: {
                            path: 'reportedBy',
                            select: 'fullName phoneNo address'
                        }
                    }
                },
                {
                    path: 'vendor', // If assigned to a vendor
                    select: 'companyName processingFacilityLocation address'
                }
            ]
        })
        .lean();

    if (!collector) {

    }

    const formattedPickups = collector.assignedPickups.map(request => {
        const bin = request.bin;
        if (!bin) return null; // Skip if bin is not populated for some reason

        // Find a representative report from the bin for display purposes
        const representativeReport = bin.assignedReports?.[0];
        const pickupLocation = bin.location; // Bin's location is the pickup location

        let dropoffLocation = null;
        if (request.vendor && request.vendor.processingFacilityLocation) {
            dropoffLocation = request.vendor.processingFacilityLocation;
        } else {
            // Default to a landfill location if no vendor is assigned
            dropoffLocation = { type: 'Point', coordinates: [75.8169, 26.8365] }; // Example Landfill
        }

        return {
            requestId: request._id,
            status: request.status,
            bin: {
                _id: bin._id,
                binId: bin.binId,
                location: bin.location,
                fillLevel: bin.fillLevel,
                wasteType: bin.wasteType,
                currentWasteComposition: bin.currentWasteComposition,
                // Display info from a representative report in the bin
                representativeReport: representativeReport ? {
                    _id: representativeReport._id,
                    userReportedType: representativeReport.userReportedType,
                    mlIdentifiedType: representativeReport.mlIdentifiedType,
                    approximateWeight: representativeReport.approximateWeight,
                    reporter: {
                        name: representativeReport.reportedBy?.fullName,
                        phone: representativeReport.reportedBy?.phoneNo,
                        address: representativeReport.reportedBy?.address
                    },
                    photoUrl: representativeReport.photoUrl?.[0] || null // First image
                } : null
            },
            vendor: request.vendor ? {
                name: request.vendor.companyName,
                facilityLocation: request.vendor.processingFacilityLocation,
                address: request.vendor.address
            } : null,
            pickupLocation: pickupLocation, // Bin's location
            dropoffLocation: dropoffLocation, // Vendor's facility or landfill
            createdAt: request.createdAt
        };
    }).filter(Boolean); // Filter out nulls

    return res.status(200).json(
        new ApiResponse(200, formattedPickups, 'Assigned pickups fetched successfully')
    );
});


const markAsCollected = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { requestId, currentLocation } = req.body;

        if (!requestId || !currentLocation || !Array.isArray(currentLocation) || currentLocation.length !== 2) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(400, "Invalid request parameters. requestId and currentLocation [longitude, latitude] are required."));
        }

        const request = await WasteProcessingRequest.findById(requestId)
            .populate('bin')
            .populate('vendor')
            .session(session);

        if (!request) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(404, 'Processing request not found'));
        }
        if (!request.bin) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(404, 'Associated bin not found for this request'));
        }
        if (!request.collector || request.collector.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(403, 'Not authorized to collect this pickup. It is not assigned to you.'));
        }

        // Check proximity to bin (optional)
        const distance = calculateDistance(
            currentLocation,
            request.bin.location.coordinates
        );
        // if (distance > 50) {
        //     await session.abortTransaction();
        //     session.endSession();
        //     return next(new ApiError(400, `You must be within 50 meters of the bin to mark as collected. Current distance: ${distance.toFixed(2)}m`));
        // }

        // 1. Update WasteProcessingRequest
        request.status = 'collected_from_bin';
        request.collectionDetails = {
            timestamp: new Date(),
            location: {
                type: 'Point',
                coordinates: currentLocation
            }
        };
        await request.save({ session });

        // 2. Reset Bin state
        await Bin.findByIdAndUpdate(
            request.bin._id,
            {
                $set: {
                    fillLevel: 0,
                    currentWasteComposition: {},
                    lastCollected: new Date()
                }
            },
            { session }
        );

        // 3. Update WasteReports
        await WasteReport.updateMany(
            { assignedBin: request.bin._id, status: { $in: ['assigned_to_bin', 'awaiting_collection'] } },
            {
                $set: {
                    status: 'collected_from_bin',
                    collectionTimestamp: new Date(),
                    collectedBy: req.user._id
                }
            },
            { session }
        );

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    bin: request.bin,
                    nextDestination: request.vendor?.processingFacilityLocation?.coordinates
                },
                'Bin contents marked as collected successfully. Proceed to drop-off.'
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error marking bin as collected:', error);
        next(new ApiError(500, 'Error marking bin as collected: ' + error.message));
    }
});


// Mark delivery as completed
// const markAsDelivered = asyncHandler(async (req, res, next) => {
//     try {
//         const { requestId, currentLocation } = req.body;

//         if (!requestId || !currentLocation || !Array.isArray(currentLocation) || currentLocation.length !== 2) {
//             return next(new ApiError(400, "Invalid request parameters. requestId and currentLocation [longitude, latitude] are required."));
//         }

//         const request = await WasteProcessingRequest.findById(requestId)
//             .populate('bin')
//             .populate('vendor')
//             .lean();

//         if (!request) {
//             return next(new ApiError(404, 'Processing request not found'));
//         }
//         if (!request.bin) {
//             return next(new ApiError(404, 'Associated bin not found for this request'));
//         }
//         if (!request.collector || request.collector.toString() !== req.user._id.toString()) {
//             return next(new ApiError(403, 'Not authorized to deliver this pickup. It is not assigned to you.'));
//         }

//         let dropoffCoordinates;
//         let deliveredToVendorId = null;

//         if (request.vendor && request.vendor.processingFacilityLocation && request.vendor.processingFacilityLocation.coordinates) {
//             dropoffCoordinates = request.vendor.processingFacilityLocation.coordinates;
//             deliveredToVendorId = request.vendor._id;
//         } else {
//             // If no vendor, assume delivery to a default landfill
//             dropoffCoordinates = [75.8169, 26.8365]; // Example Landfill coordinates [lng, lat]
//             console.warn(`Request ${requestId} has no vendor, assuming delivery to default landfill.`);
//         }

//         // Check proximity to dropoff location (50 meters)
//         const distance = calculateDistance(
//             currentLocation,
//             dropoffCoordinates
//         );

//         if (distance > 50) { // 50 meters
//             return next(new ApiError(400, `You must be within 50 meters of the dropoff facility to mark as delivered. Current distance: ${distance.toFixed(2)}m`));
//         }

//         // Update WasteProcessingRequest status
//         await WasteProcessingRequest.findByIdAndUpdate(requestId, {
//             status: 'delivered_to_vendor', // New status
//             deliveryDetails: {
//                 timestamp: new Date(),
//                 location: {
//                     type: 'Point',
//                     coordinates: currentLocation
//                 }
//             }
//         });

//         // Update status of all associated WasteReports to 'delivered_to_vendor' or 'landfilled'
//         const updateReportStatus = deliveredToVendorId ? 'delivered_to_vendor' : 'landfilled';
//         await WasteReport.updateMany(
//             { assignedBin: request.bin._id, status: { $in: ['collected_from_bin'] } },
//             {
//                 $set: {
//                     status: updateReportStatus,
//                     deliveryTimestamp: new Date(),
//                     deliveredToVendor: deliveredToVendorId
//                 }
//             }
//         );

//         // If delivered to a vendor, update vendor's metrics based on bin's contents
//         if (deliveredToVendorId) {
//             const binContents = request.bin.currentWasteComposition; // Map of wasteType -> weight
//             let totalWeightProcessed = 0;
//             let totalEnergyGenerated = 0;
//             let totalCo2Reduced = 0;

//             // This requires the ML service's waste_classification data or similar lookup
//             // For now, use a simplified calculation or assume ML details are available in WasteReports
//             // A more robust solution would involve fetching waste_classification from ML service or config
//             const mockWasteClassification = { // This should ideally come from a shared config or ML service
//                 'plastic waste': { energy_potential: 80, co2_reduction: 0.9 },
//                 'organic waste': { energy_potential: 75, co2_reduction: 1.1 },
//                 'metal waste': { energy_potential: 45, co2_reduction: 0.7 },
//                 'glass waste': { energy_potential: 25, co2_reduction: 0.4 },
//                 'E-waste': { energy_potential: 85, co2_reduction: 1.2 },
//                 'automobile wastes': { energy_potential: 65, co2_reduction: 0.8 },
//                 'battery waste': { energy_potential: 90, co2_reduction: 1.5 },
//                 'light bulbs': { energy_potential: 55, co2_reduction: 0.9 },
//                 'mixed': { energy_potential: 40, co2_reduction: 0.5 } // Fallback for mixed
//             };

//             for (const [type, weight] of Object.entries(binContents)) {
//                 totalWeightProcessed += weight;
//                 const typeInfo = mockWasteClassification[type] || mockWasteClassification['mixed'];
//                 totalEnergyGenerated += (typeInfo.energy_potential || 0) * weight;
//                 totalCo2Reduced += (typeInfo.co2_reduction || 0) * weight;
//             }

//             await Vendor.findByIdAndUpdate(deliveredToVendorId, {
//                 $inc: {
//                     wasteProcessed: totalWeightProcessed,
//                     energyProduced: totalEnergyGenerated,
//                     co2Reduced: totalCo2Reduced
//                 }
//             });
//             console.log(`Vendor ${deliveredToVendorId} metrics updated.`);
//         }

//         res.status(200).json(new ApiResponse(200, {}, 'Delivery marked as completed successfully'));
//     } catch (error) {
//         console.error('Error marking delivery as completed:', error);
//         next(new ApiError(500, 'Error marking delivery as completed: ' + error.message));
//     }
// });

// MODIFIED FUNCTION: The collector now only confirms the weight delivered.
// The vendor will be responsible for adding the final energy/CO2 metrics upon processing.
const markAsDelivered = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { requestId, currentLocation } = req.body;

        if (!requestId || !currentLocation || !Array.isArray(currentLocation) || currentLocation.length !== 2) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(400, "Invalid request parameters. requestId and currentLocation are required."));
        }

        const request = await WasteProcessingRequest.findById(requestId)
            .populate('bin')
            .populate('vendor')
            .session(session); // attach session

        if (!request) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(404, 'Processing request not found'));
        }
        if (!request.collector || request.collector.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            console.log("not authorized")
            return next(new ApiError(403, 'Not authorized to deliver this pickup.'));
        }

        let dropoffCoordinates;
        if (request.vendor && request.vendor.processingFacilityLocation) {
            dropoffCoordinates = request.vendor.processingFacilityLocation.coordinates;
        } else {
            dropoffCoordinates = [75.8169, 26.8365]; // Default Landfill
        }

        const distance = calculateDistance(currentLocation, dropoffCoordinates);
        // if (distance > 50) { 
        //     await session.abortTransaction();
        //     session.endSession();
        //     return next(new ApiError(400, `You must be within 50m of the dropoff location. Current distance: ${distance.toFixed(2)}m`));
        // }

        // --- ATOMIC UPDATES ---
        // 1. Update WasteProcessingRequest
        request.status = 'delivered_to_vendor';
        request.deliveryDetails = {
            timestamp: new Date(),
            location: { type: 'Point', coordinates: currentLocation }
        };
        await request.save({ session });

        // 2. Update WasteReports
        const updateReportStatus = request.vendor ? 'delivered_to_vendor' : 'landfilled';
        await WasteReport.updateMany(
            { assignedBin: request.bin._id, status: 'collected_from_bin' },
            {
                $set: {
                    status: updateReportStatus,
                    deliveryTimestamp: new Date(),
                    deliveredToVendor: request.vendor?._id
                }
            },
            { session }
        );

        console.log('bendor tak a gye h', request.bin.currentWasteComposition)
        // 3. Update Vendor metrics (if applicable)
        if (request.vendor) {
            const composition = request.bin.currentWasteComposition || {};

            // If it's a Mongoose Map, convert it to a plain JS object
            const plainComp = composition instanceof Map ? Object.fromEntries(composition) : composition;

            const totalWeightInBin = Object.values(plainComp)
                .map(val => Number(val) || 0)   // force numbers
                .reduce((sum, weight) => sum + weight, 0);

            await Vendor.findByIdAndUpdate(
                request.vendor._id,
                { $inc: { wasteProcessed: totalWeightInBin } },
                { session }
            );

            console.log(`Vendor ${request.vendor._id} metrics updated with ${totalWeightInBin}kg of waste.`);
        }


        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json(new ApiResponse(200, {}, 'Delivery marked as completed successfully'));
    } catch (error) {
        // Rollback on error
        await session.abortTransaction();
        session.endSession();

        console.error('Error marking delivery as completed:', error);
        next(new ApiError(500, 'Error marking delivery as completed: ' + error.message));
    }
});


// NEW FUNCTION: Provides a complete history of all jobs for the logged-in collector.
const getCollectionHistory = asyncHandler(async (req, res, next) => {
    try {
        const collectionHistory = await WasteProcessingRequest.find({ collector: req.user._id })
            .populate('bin', 'binId location wasteType')
            .populate('vendor', 'companyName')
            .sort({ createdAt: -1 })
            .lean();

        if (!collectionHistory) {
            return res.status(200).json(new ApiResponse(200, [], "No collection history found."));
        }

        res.status(200).json(new ApiResponse(200, collectionHistory, "Collection history fetched successfully."));
    } catch (error) {
        next(new ApiError(500, 'Error fetching collection history: ' + error.message));
    }
});



// Get collector dashboard stats
const getCollectorDashboard = asyncHandler(async (req, res, next) => {
    try {
        const collector = await Collector.findById(req.user._id)
            .populate({
                path: 'assignedPickups',
                // Filter for requests that are still active for the collector
                match: { status: { $in: ['collector_assigned', 'collected_from_bin'] } },
                populate: [
                    {
                        path: 'bin', // Populate the bin
                        select: 'binId location fillLevel wasteType currentWasteComposition assignedReports',
                        populate: {
                            path: 'assignedReports',
                            select: 'mlIdentifiedType approximateWeight photoUrl'
                        }
                    },
                    {
                        path: 'vendor',
                        select: 'companyName processingFacilityLocation'
                    }
                ]
            })
            .lean();

        if (!collector) {
            return next(new ApiError(404, "Collector not found"));
        }

        // Fetch all requests ever assigned to this collector to get 'delivered' count
        const allCollectorRequests = await WasteProcessingRequest.find({ collector: req.user._id }).lean();

        const totalAssigned = allCollectorRequests.length;
        const pendingPickups = allCollectorRequests.filter(p => p.status === 'collector_assigned').length;
        const deliveredPickups = allCollectorRequests.filter(p => p.status === 'delivered_to_vendor').length;

        const dashboardData = {
            totalAssigned,
            pendingPickups,
            deliveredPickups,
            // Recent pickups are the active ones
            recentPickups: collector.assignedPickups.slice(0, 15).map(request => ({
                requestId: request._id,
                status: request.status,
                binId: request.bin?.binId || 'N/A',
                binLocation: request.bin?.location?.coordinates || [],
                binFillLevel: request.bin?.fillLevel || 0,
                binWasteType: request.bin?.wasteType || 'N/A',
                // Display info from a representative report in the bin
                representativeWasteType: request.bin?.assignedReports?.[0]?.mlIdentifiedType || 'N/A',
                representativeWeight: request.bin?.assignedReports?.[0]?.approximateWeight || 0,
                vendorName: request.vendor?.companyName || 'Landfill',
                createdAt: request.createdAt
            }))
        };

        res.status(200).json(new ApiResponse(200, dashboardData, 'Collector dashboard data fetched successfully'));
    } catch (error) {
        console.error("Error fetching collector dashboard: ", error);
        next(new ApiError(500, 'Error fetching collector dashboard: ' + error.message));
    }
});

// get all pending pickups with dropoff locations (for route optimization)
const getPendingPickupsWithDropoff = asyncHandler(async (req, res, next) => {
    try {
        const DEFAULT_LANDFILL = {
            name: "Landfill 1",
            coordinates: [75.8169, 26.8365] // [longitude, latitude]
        };

        if (!req.user?._id) {
            return next(new ApiError(400, 'User ID is required'));
        }

        const collector = await Collector.findById(req.user._id)
            .populate({
                path: 'assignedPickups',
                match: { status: { $in: ['collector_assigned', 'collected_from_bin'] } },
                populate: [
                    { path: 'bin', select: 'binId location wasteType currentWasteComposition' },
                    { path: 'vendor', select: 'companyName processingFacilityLocation' }
                ]
            })
            .lean();

        if (!collector) {
            return next(new ApiError(404, 'Collector not found'));
        }

        const processedPickups = collector.assignedPickups
            .filter(request => request.bin) // Ensure bin is populated
            .map(request => {
                const bin = request.bin;
                let dropoffLocation = DEFAULT_LANDFILL;

                if (request.vendor && request.vendor.processingFacilityLocation) {
                    dropoffLocation = {
                        name: request.vendor.companyName,
                        coordinates: request.vendor.processingFacilityLocation.coordinates
                    };
                }

                return {
                    requestId: request._id,
                    status: request.status,
                    binId: bin.binId,
                    pickupLocation: bin.location.coordinates, // Bin's location
                    dropoffLocation: dropoffLocation,
                    binContents: bin.currentWasteComposition, // Full composition
                    binWasteType: bin.wasteType, // Primary bin type
                    estimatedWeight: Object.values(bin.currentWasteComposition).reduce((sum, val) => sum + val, 0) // Sum of weights in bin
                };
            });

        res.status(200).json(
            new ApiResponse(200, processedPickups, 'Pickups with dropoff locations fetched successfully')
        );

    } catch (error) {
        next(error instanceof ApiError ? error :
            new ApiError(500, 'Error fetching pickups with dropoff locations: ' + error.message));
    }
});

const getWasteDetails = async (req, res, next) => {
    try {
        const { wasteId } = req.params; // This is a WasteReport ID

        const wasteReport = await WasteReport.findById(wasteId)
            .populate('reportedBy', 'fullName phoneNo address')
            .populate('assignedBin', 'binId location fillLevel wasteType currentWasteComposition') // Populate assigned bin
            .lean();

        if (!wasteReport) {
            return next(new ApiError(404, 'Waste report not found'));
        }

        let processingRequestDetails = null;
        if (wasteReport.assignedBin) {
            // Find the most recent active processing request for this bin
            const activeRequest = await WasteProcessingRequest.findOne({
                bin: wasteReport.assignedBin._id,
                status: { $in: ['collector_assigned', 'collected_from_bin', 'delivered_to_vendor', 'processed_by_vendor'] }
            })
                .populate('vendor', 'companyName processingFacilityLocation address')
                .populate('collector', 'fullName phoneNo employeeId')
                .sort({ createdAt: -1 })
                .lean();

            if (activeRequest) {
                processingRequestDetails = {
                    _id: activeRequest._id,
                    status: activeRequest.status,
                    vendor: activeRequest.vendor ? {
                        _id: activeRequest.vendor._id,
                        companyName: activeRequest.vendor.companyName,
                        address: activeRequest.vendor.address,
                        processingFacilityLocation: activeRequest.vendor.processingFacilityLocation.coordinates
                    } : null,
                    collector: activeRequest.collector ? {
                        _id: activeRequest.collector._id,
                        fullName: activeRequest.collector.fullName,
                        phoneNo: activeRequest.collector.phoneNo,
                        employeeId: activeRequest.collector.employeeId
                    } : null,
                    collectionDetails: activeRequest.collectionDetails || null,
                    deliveryDetails: activeRequest.deliveryDetails || null,
                    processingCompletionDetails: activeRequest.processingCompletionDetails || null,
                    createdAt: activeRequest.createdAt
                };
            }
        }

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
                    address: wasteReport.address, // Assuming address is a string or populated
                    zone: wasteReport.assignedZone
                },
                images: wasteReport.photoUrl,
                createdAt: wasteReport.createdAt,
                assignedBin: wasteReport.assignedBin ? { // Include bin details
                    _id: wasteReport.assignedBin._id,
                    binId: wasteReport.assignedBin.binId,
                    location: wasteReport.assignedBin.location.coordinates,
                    fillLevel: wasteReport.assignedBin.fillLevel,
                    wasteType: wasteReport.assignedBin.wasteType,
                    currentWasteComposition: wasteReport.assignedBin.currentWasteComposition
                } : null
            },
            resident: {
                name: wasteReport.reportedBy.fullName,
                contact: wasteReport.reportedBy.phoneNo,
                address: wasteReport.reportedBy.address
            },
            currentProcessingRequest: processingRequestDetails, // Details of the active request for the bin
            // processingHistory: this would be more complex, perhaps fetching all requests for the assigned bin
        };

        return res.status(200)
            .json(new ApiResponse(200, responseData, 'Waste details fetched successfully'));

    } catch (error) {
        console.error("Error fetching waste details:", error);
        next(new ApiError(
            error.statusCode || 500,
            error.message || 'Error fetching waste details'
        ));
    }
};

// Helper function to calculate distance between two points (Haversine formula)
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

// Helper function to calculate rewards (deprecated if residents.controller.js handles it)
// function calculateReward(weight, isUseful) {
//     const W = 10; // Base reward for non-useful waste
//     const N = 15; // Base reward for useful waste
//     return Math.floor(isUseful ? N * weight : W * weight);
// }


// controllers/wasteController.js (This function is also in residents.controller.js)
// NOTE: This function is duplicated in residents.controller.js.
// It's recommended to use the one in residents.controller.js and remove this one,
// or clearly define their distinct purposes (e.g., this one for collector's view, other for resident's view).
// For now, I'm keeping it but noting the duplication.

const getMyProfile = async (req, res, next) => {
    try {
        const collector = await Collector.findById(req.user._id).select('-password').lean(); // Use lean()
        if (!collector) {
            return next(new ApiError(404, 'Collector not found'));
        }
        res.status(200).json(new ApiResponse(200, { user: collector }, 'Collector profile fetched'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching collector profile: ' + error.message));
    }
}


export {
    registerCollector,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getMyProfile,

    updateLocation,
    getAssignedPickups,
    markAsCollected,
    markAsDelivered,
    getCollectorDashboard,
    getPendingPickupsWithDropoff,
    getWasteDetails,
    getCollectionHistory,
};
