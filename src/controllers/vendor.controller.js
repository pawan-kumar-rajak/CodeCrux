import { Vendor, Vendor as User } from "../models/vendor.model.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { Collector } from "../models/collector.model.js";
import mongoose from "mongoose";
import { parseCoordinates } from "../utils/location_handling.js";
import jwt from "jsonwebtoken"; // Import jwt for token generation
import { Bin } from "../models/bin.model.js";
import { Resident } from "../models/resident.model.js";
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

        // Validate requiredWasteTypes against allowed enum values from WasteReport model
        const allowedWasteTypes = ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"];
        if (!Array.isArray(requiredWasteTypes) || requiredWasteTypes.length === 0 || !requiredWasteTypes.every(type => allowedWasteTypes.includes(type))) {
            return next(new ApiError(400, `Invalid requiredWasteTypes. Must be an array of valid types: ${allowedWasteTypes.join(', ')}`));
        }

        // Validate processingMethod against allowed enum values from Vendor model
        const allowedProcessingMethods = ["torrefaction", "recycling", "composting", "pyrolysis"];
        if (!allowedProcessingMethods.includes(processingMethod)) {
            return next(new ApiError(400, `Invalid processingMethod. Must be one of: ${allowedProcessingMethods.join(', ')}`));
        }

        // Check if the vendor already exists by email or license number
        const existingVendor = await Vendor.findOne({ $or: [{ email }, { licenseNo }] });
        if (existingVendor) {
            return next(new ApiError(409, "Vendor with this email or license number already exists"));
        }

        // Process coordinates for processing facility location
        const parsedCoordinates = parseCoordinates(processingFacilityLocation.coordinates);
        if (!parsedCoordinates || parsedCoordinates.length !== 2) {
            return next(new ApiError(400, "Invalid coordinates format for processing facility. Expected [longitude, latitude]"));
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
        return next(new ApiError(500, "Something went wrong while registering the vendor: " + error.message));
    }
});


const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body; // Removed username as it's not in vendor model
    
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "Vendor does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return next( new ApiError(401, "Invalid Vendor credentials"))
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
                "Vendor logged In Successfully"
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
// const getAvailableWaste = asyncHandler(async (req, res, next) => {
//     try {
//         const vendor = await Vendor.findById(req.user._id).lean();

//         if (!vendor || !vendor.processingFacilityLocation || !vendor.processingFacilityLocation.coordinates) {
//             return next(new ApiError(404, 'Vendor or processing facility location not found. Please update your profile.'));
//         }

//         // Find bins near vendor's facility
//         const candidateBins = await Bin.find({
//             location: {
//                 $near: {
//                     $geometry: {
//                         type: "Point",
//                         coordinates: vendor.processingFacilityLocation.coordinates
//                     },
//                     $maxDistance: 1000000 // 100 km in meters
//                 }
//             },
//             fillLevel: { $gt: 50 },
//             $or: [
//                 { wasteType: { $in: vendor.requiredWasteTypes } },
//                 { 'currentWasteComposition': { $exists: true, $ne: {} } }
//             ]
//         }).lean();

//         // Further filter bins
//         const filteredBins = candidateBins.filter(bin => {
//             if (vendor.requiredWasteTypes.includes(bin.wasteType)) return true;
//             for (const [wasteTypeInBin] of Object.entries(bin.currentWasteComposition || {})) {
//                 if (vendor.requiredWasteTypes.includes(wasteTypeInBin)) return true;
//             }
//             return false;
//         });

     

//         // Exclude bins with existing processing requests
//         const existingRequestsForBins = await WasteProcessingRequest.find({
//             bin: { $in: filteredBins.map(b => b._id) },
//             status: { $in: ['pending_vendor_offer', 'vendor_accepted', 'collector_assigned', 'collected_from_bin'] }
//         }).select('bin').lean();

//         const binsWithExistingRequests = new Set(existingRequestsForBins.map(req => req.bin.toString()));

//         const finalAvailableBins = filteredBins.filter(bin => !binsWithExistingRequests.has(bin._id.toString()));

//         // Get representative reports only, fully populated
//         const representativeReports = (
//             await Promise.all(
//                 finalAvailableBins.map(bin =>
//                     WasteReport.findOne({ assignedBin: bin._id })
//                         .populate('reportedBy', 'fullName phoneNo')
//                         .lean()
//                 )
//             )
//         ).filter(Boolean); // Remove nulls


//         res.status(200).json(
//             new ApiResponse(
//                 200,
//                 representativeReports,
//                 'Available waste reports fetched successfully'
//             )
//         );
//     } catch (error) {
//         console.error('Error in getAvailableWaste:', error);
//         next(new ApiError(500, 'Error fetching available waste bins: ' + error.message));
//     }
// });

// MODIFIED FUNCTION
// Get available waste reports matching vendor's requirements
const getAvailableWaste = asyncHandler(async (req, res, next) => {
    try {
        // 1. Get vendor and ensure location exists
        const vendor = await Vendor.findById(req.user._id).lean();
        if (!vendor || !vendor.processingFacilityLocation || !vendor.processingFacilityLocation.coordinates) {
            return next(new ApiError(404, 'Vendor or processing facility location not found. Please update your profile.'));
        }

        const vendorCoords = vendor.processingFacilityLocation.coordinates;

        // 2. Find bins near vendor facility that are >50% full and match required waste types or have any composition
        const candidateBins = await Bin.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: vendorCoords },
                    $maxDistance: 1000000 // 100 km
                }
            },
            fillLevel: { $gt: 50 },
            $or: [
                { wasteType: { $in: vendor.requiredWasteTypes } },
                { 'currentWasteComposition': { $exists: true, $ne: {} } }
            ]
        }).lean();

        // 3. Further filter bins to match vendor required waste types explicitly
        const filteredBins = candidateBins.filter(bin => {
            if (vendor.requiredWasteTypes.includes(bin.wasteType)) return true;
            for (const [wasteTypeInBin] of Object.entries(bin.currentWasteComposition || {})) {
                if (vendor.requiredWasteTypes.includes(wasteTypeInBin)) return true;
            }
            return false;
        });

        // 4. Exclude bins with active processing requests
        const existingRequests = await WasteProcessingRequest.find({
            bin: { $in: filteredBins.map(b => b._id) },
            status: { $in: ['pending_vendor_offer', 'vendor_accepted', 'collector_assigned', 'collected_from_bin'] }
        }).select('bin').lean();

        const binsWithActiveRequests = new Set(existingRequests.map(req => req.bin.toString()));
        const finalAvailableBins = filteredBins.filter(bin => !binsWithActiveRequests.has(bin._id.toString()));

        // 5. Reverse populate assignedReports from WasteReport.assignedBin
        for (const bin of finalAvailableBins) {
            bin.assignedReports = await WasteReport.find({ assignedBin: bin._id })
                .populate('reportedBy', 'fullName phoneNo')
                .lean();
        }

        // 6. Send response
        res.status(200).json(
            new ApiResponse(
                200,
                finalAvailableBins,
                'Available waste bins fetched successfully'
            )
        );

    } catch (error) {
        console.error('Error in getAvailableWaste:', error);
        next(new ApiError(500, 'Error fetching available waste bins: ' + error.message));
    }
});


// Request waste collection
// MODIFIED FUNCTION: Assigns the closest collector instead of a random one.
const requestWasteCollection = asyncHandler(async (req, res, next) => {
    let { binIds } = req.body;

    if (!Array.isArray(binIds) || binIds.length === 0) {
        return next(new ApiError(400, 'binIds must be a non-empty array.'));
    }

    const successfullyRequested = [];
    const failedRequests = [];

    for (const binId of binIds) {
        if (!mongoose.Types.ObjectId.isValid(binId)) {
            failedRequests.push({ binId, reason: "Invalid ID format." });
            continue;
        }

        const bin = await Bin.findById(binId).lean();
        if (!bin) {
            failedRequests.push({ binId, reason: "Bin not found." });
            continue;
        }

        if (!bin.assignedZone) {
            failedRequests.push({ binId, reason: `Bin ${bin.binId} has no assigned zone.` });
            continue;
        }

        const existingRequest = await WasteProcessingRequest.findOne({
            bin: binId,
            status: { $in: ['pending_vendor_offer', 'vendor_accepted', 'collector_assigned', 'collected_from_bin'] }
        });

        if (existingRequest) {
            failedRequests.push({ binId, reason: `Bin ${bin.binId} already has an active collection request.` });
            continue;
        }

        // Find the collector in the correct zone who is closest to the bin.
        let closestCollector = await Collector.findOne({
            assignedZone: bin.assignedZone,
            currentLocation: {
                $nearSphere: {
                    $geometry: bin.location, 
                    // Optional: Set a max distance in meters (e.g., 5km)
                    // $maxDistance: 5000
                }
            }
        });
        
        

        if (!closestCollector) {
            closestCollector = await Collector.findOne({ assignedZone: bin.assignedZone });
            if(!closestCollector){

                failedRequests.push({ binId, reason: `No collectors are currently available or nearby in zone '${bin.assignedZone}' for Bin ${bin.binId}.` });
                continue ;
            }
        }

        // All checks passed, create the request and assign it to the closest collector
        const newRequest = await WasteProcessingRequest.create({
            bin: binId,
            vendor: req.user._id,
            collector: closestCollector._id, // Assign to the closest one found
            status: 'collector_assigned',
            requestedWasteWeight: Object.values(bin.currentWasteComposition || {}).reduce((sum, val) => sum + val, 0),
            requestedWasteType: bin.wasteType
        });

        await Collector.findByIdAndUpdate(closestCollector._id, {
            $push: { assignedPickups: newRequest._id }
        });

        await WasteReport.updateMany(
            { assignedBin: binId, status: 'assigned_to_bin' },
            { $set: { status: 'awaiting_collection' } }
        );

        successfullyRequested.push(newRequest);
    }

    if (successfullyRequested.length === 0) {
        const errorReason = failedRequests[0]?.reason || "Unknown error.";
        return next(new ApiError(400, `No valid bins could be requested. First error: ${errorReason}`));
    }

    res.status(201).json(new ApiResponse(201, { successfullyRequested, failedRequests }, 'Collection request processed and assigned to the closest available collectors.'));
});


// Get vendor dashboard stats
const getVendorDashboard = asyncHandler(async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.user._id).lean();

        if (!vendor) {
            return next(new ApiError(404, "Vendor not found"));
        }

        const totalRequestsMade = await WasteProcessingRequest.countDocuments({ vendor: req.user._id });
        const pendingRequests = await WasteProcessingRequest.countDocuments({ vendor: req.user._id, status: { $in: ['pending_vendor_offer', 'collector_assigned', 'collected_from_bin'] } });
        const deliveredRequests = await WasteProcessingRequest.countDocuments({ vendor: req.user._id, status: 'delivered_to_vendor' });
        const processedRequests = await WasteProcessingRequest.countDocuments({ vendor: req.user._id, status: 'processed_by_vendor' });


        const recentRequests = await WasteProcessingRequest.find({ vendor: req.user._id })
                                    .populate('bin', 'binId wasteType location') // Populate bin details
                                    .sort({ createdAt: -1 }).limit(5).lean();

        const dashboardData = {
            userId: vendor._id,
            companyName:vendor.companyName,
            totalRequests: totalRequestsMade,
            pendingRequests: pendingRequests,
            deliveredRequests: deliveredRequests,
            processedRequests: processedRequests, // New metric
            wasteProcessed: vendor.wasteProcessed || 0,
            energyProduced: vendor.energyProduced || 0,
            co2Reduced: vendor.co2Reduced || 0,
            recentRequests: recentRequests.map(req => ({ // Format for display
                _id: req._id,
                status: req.status,
                binId: req.bin?.binId || 'N/A',
                requestedWasteType: req.requestedWasteType || req.bin?.wasteType || 'N/A',
                requestedWasteWeight: req.requestedWasteWeight || req.bin?.fillLevel || 0,
                createdAt: req.createdAt
            }))
        };

        res.status(200).json(new ApiResponse(200, dashboardData, 'Vendor dashboard data fetched successfully'));
    } catch (error) {
        console.error('Error fetching vendor dashboard:', error);
        next(new ApiError(500, 'Error fetching vendor dashboard: ' + error.message));
    }
});

// Reject waste request
const rejectWasteRequest = asyncHandler(async (req, res, next) => {
    try {
        const { requestId } = req.body; // This is a WasteProcessingRequest ID

        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            return next(new ApiError(400, "Invalid request ID."));
        }

        const request = await WasteProcessingRequest.findById(requestId)
                                .populate('bin');

        if (!request) {
            return next(new ApiError(404, 'Processing request not found.'));
        }
        if (!request.bin) {
            return next(new ApiError(404, 'Associated bin not found for this request.'));
        }

        if (request.vendor.toString() !== req.user._id.toString()) {
            return next(new ApiError(403, 'Not authorized to reject this request.'));
        }

        request.status = 'rejected_by_vendor';
        await request.save();

        // Update status of all associated WasteReports to 'rejected_by_vendor'
        await WasteReport.updateMany(
            { assignedBin: request.bin._id, status: { $in: ['awaiting_collection', 'collected_from_bin'] } },
            { $set: { status: 'rejected_by_vendor' } }
        );

        // Optionally, notify the collector if one was assigned
        if (request.collector) {
            console.log(`Collector ${request.collector} notified that request ${requestId} was rejected by vendor.`);
            // Implement notification logic for collector
        }

        res.status(200).json(new ApiResponse(200, null, 'Waste request rejected successfully by vendor.'));
    } catch (error) {
        console.error('Error rejecting waste request:', error);
        next(new ApiError(500, 'Error rejecting waste request: ' + error.message));
    }
});

// Modified: View complete details of garbage (WasteReport or WasteProcessingRequest for a Bin)
// MODIFIED FUNCTION: Renamed and refactored to specifically get Bin details
const viewGarbageDetails = asyncHandler(async (req, res, next) => {
    try {
        const { garbageId: binId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(binId)) {
            return next(new ApiError(400, "Invalid Bin ID format."));
        }

        // 1. Find the Bin
        const bin = await Bin.findById(binId).lean();
        if (!bin) {
            return next(new ApiError(404, 'Bin not found for the provided ID.'));
        }

        // 2. Fetch all reports assigned to this bin
        const assignedReports = await WasteReport.find({ assignedBin: bin._id })
            .populate('reportedBy', 'fullName phoneNo email')
            .lean();

        // 3. Fetch processing history
        const processingHistory = await WasteProcessingRequest.find({ bin: bin._id })
            .populate('vendor', 'companyName')
            .populate('collector', 'fullName')
            .sort({ createdAt: -1 })
            .lean();

        // 4. Identify current active request
        const currentProcessingRequest = processingHistory.find(req =>
            ['pending_vendor_offer', 'vendor_accepted', 'collector_assigned', 'collected_from_bin', 'delivered_to_vendor'].includes(req.status)
        );

        // 5. Prepare response
        const responseData = {
            bin: {
                _id: bin._id,
                binId: bin.binId,
                location: bin.location,
                fillLevel: bin.fillLevel,
                wasteType: bin.wasteType,
                currentWasteComposition: bin.currentWasteComposition,
                assignedReports: assignedReports,
                createdAt: bin.createdAt
            },
            processingHistory,
            currentProcessingRequest: currentProcessingRequest || null
        };

        res.status(200).json(new ApiResponse(200, responseData, 'Bin details fetched successfully'));

    } catch (error) {
        console.error('Error in viewGarbageDetails:', error);
        next(new ApiError(500, 'Error fetching bin details: ' + error.message));
    }
});


// const markProcessingComplete = asyncHandler(async (req, res, next) => {
//     const { requestId, energyGenerated, co2Reduced, processingMethod } = req.body;

//     if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
//         return next(new ApiError(400, "Invalid request ID."));
//     }
//     if (typeof energyGenerated !== 'number' || typeof co2Reduced !== 'number' || !processingMethod) {
//         return next(new ApiError(400, "Energy generated, CO2 reduced, and processing method are required."));
//     }

//     const request = await WasteProcessingRequest.findById(requestId)
//                                 .populate('bin')
//                                 .lean();

//     if (!request) {
//         return next(new ApiError(404, 'Processing request not found.'));
//     }
//     if (request.vendor.toString() !== req.user._id.toString()) {
//         return next(new ApiError(403, 'Not authorized to complete this request.'));
//     }
//     if (request.status !== 'delivered_to_vendor') {
//         return next(new ApiError(400, `Cannot mark as processed. Current status is ${request.status}. Expected 'delivered_to_vendor'.`));
//     }

//     // Update WasteProcessingRequest status and metrics
//     await WasteProcessingRequest.findByIdAndUpdate(requestId, {
//         status: 'processed_by_vendor',
//         energyMetrics: {
//             generated: energyGenerated,
//             co2Reduced: co2Reduced,
//             timestamp: new Date()
//         },
//         processingCompletionDetails: {
//             timestamp: new Date(),
//             methodUsed: processingMethod,
//             energyGenerated: energyGenerated,
//             co2Reduced: co2Reduced
//         }
//     });

//     // Update all associated WasteReports to 'processed' status and add processing details
//     await WasteReport.updateMany(
//         { assignedBin: request.bin._id, status: 'delivered_to_vendor' },
//         {
//             $set: {
//                 status: 'processed',
//                 'processingDetails.completedAt': new Date(),
//                 'processingDetails.energyGenerated': energyGenerated,
//                 'processingDetails.co2Reduced': co2Reduced,
//                 'processingDetails.processedByVendor': req.user._id,
//                 'processingDetails.processingMethod': processingMethod
//             }
//         }
//     );

//     // Update Vendor's overall metrics (already done by collector on delivery, but can be re-confirmed/adjusted here if needed)
//     // For now, assuming collector's markAsDelivered updates vendor's overall totals.
//     // If you want to update vendor's totals *only* on processing completion, move that logic here.

//     res.status(200).json(new ApiResponse(200, null, 'Waste processing marked as complete.'));
// });

// MODIFIED FUNCTION: Now updates the Vendor's total energy and CO2 metrics.
// This is the final, authoritative step for these metrics.
const markProcessingComplete = asyncHandler(async (req, res, next) => {
    const { requestId, energyGenerated, co2Reduced, processingMethod } = req.body;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
        return next(new ApiError(400, "A valid request ID is required."));
    }
    if (typeof energyGenerated !== 'number' || typeof co2Reduced !== 'number' || !processingMethod) {
        return next(new ApiError(400, "Energy generated, CO2 reduced, and processing method are required fields."));
    }

    const request = await WasteProcessingRequest.findById(requestId).populate('bin');

    if (!request) {
        return next(new ApiError(404, 'Processing request not found.'));
    }
    if (request.vendor.toString() !== req.user._id.toString()) {
        return next(new ApiError(403, 'Not authorized to complete this request.'));
    }
    if (request.status !== 'delivered_to_vendor') {
        return next(new ApiError(400, `Cannot mark as processed. Current status is '${request.status}'.`));
    }

    // --- REWARD DISTRIBUTION LOGIC ---
    // 1. Find all reports associated with the processed bin.
    const reportsInBin = await WasteReport.find({ assignedBin: request.bin._id, status: 'delivered_to_vendor' });
    const totalWeightInBin = reportsInBin.reduce((sum, report) => sum + report.approximateWeight, 0);

    // 2. Iterate through each report to distribute rewards proportionally.
    for (const report of reportsInBin) {
        const resident = await Resident.findById(report.reportedBy);
        if (resident) {
            // Calculate this report's share of the outcome
            const weightProportion = report.approximateWeight / totalWeightInBin;
            const proportionalEnergy = energyGenerated * weightProportion;
            const proportionalCO2 = co2Reduced * weightProportion;

            // Calculate the Impact Bonus (you can make this formula more complex)
            // Example: 1 point per kWh + 2 points per kg of CO2 reduced
            const energyBonus = Math.round(proportionalEnergy * 1);
            const co2Bonus = Math.round(proportionalCO2 * 2);
            const impactBonus = energyBonus + co2Bonus;

            // Award the bonus to the resident
            await Resident.findByIdAndUpdate(report.reportedBy, {
                $inc: { rewardCoins: impactBonus }
            });

            // (Optional) Here you could trigger a notification to the user about their bonus.
        }
    }
    // --- END NEW LOGIC ---

    // --- LOGIC CHANGE ---
    // 1. Update the WasteProcessingRequest
    await WasteProcessingRequest.findByIdAndUpdate(requestId, {
        status: 'processed_by_vendor',
        'processingCompletionDetails.timestamp': new Date(),
        'processingCompletionDetails.methodUsed': processingMethod,
        'processingCompletionDetails.energyGenerated': energyGenerated,
        'processingCompletionDetails.co2Reduced': co2Reduced,
    });

    // 2. Update all associated WasteReports
    await WasteReport.updateMany(
        { assignedBin: request.bin._id, status: 'delivered_to_vendor' },
        {
            $set: {
                status: 'processed',
                'processingDetails.completedAt': new Date(),
                'processingDetails.energyGenerated': energyGenerated,
                'processingDetails.co2Reduced': co2Reduced,
                'processingDetails.processedByVendor': req.user._id,
                'processingDetails.processingMethod': processingMethod
            }
        }
    );

    // 3. Increment the Vendor's own aggregate metrics with the FINAL numbers.
    await Vendor.findByIdAndUpdate(req.user._id, {
        $inc: {
            energyProduced: energyGenerated,
            co2Reduced: co2Reduced
        }
    });
    // --- END LOGIC CHANGE ---

    res.status(200).json(new ApiResponse(200, {}, 'Waste processing marked as complete.'));
});

// NEW FUNCTION: Gets exhaustive details for a single WasteProcessingRequest.
const getProcessingRequestDetails = asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return next(new ApiError(400, "Invalid Request ID format."));
    }

    const requestDetails = await WasteProcessingRequest.findById(requestId)
        .populate({
            path: 'bin',
            select: 'binId location fillLevel currentWasteComposition',
           
        })
        .populate('collector', 'fullName employeeId email phoneNo vehicleNo vehicleType')
        .lean();

    if (!requestDetails) {
        return next(new ApiError(404, "Processing request not found."));
    }

    // Security check: Ensure the request belongs to the vendor asking for it.
    if (requestDetails.vendor.toString() !== vendorId.toString()) {
        return next(new ApiError(403, "You are not authorized to view this request."));
    }

    return res.status(200).json(new ApiResponse(200, requestDetails, "Processing request details fetched successfully."));
});

export {
    registerVendor,
    loginUser,
    logoutUser,
    refreshAccessToken,

    getAvailableWaste,
    requestWasteCollection,
    getVendorDashboard,
    rejectWasteRequest,
    viewGarbageDetails,
    markProcessingComplete,
    getProcessingRequestDetails 
};
