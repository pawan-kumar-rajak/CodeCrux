import { asyncHandler } from "../utils/asyncHandler.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { Resident } from "../models/resident.model.js";
import { Vendor } from "../models/vendor.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { mlService } from "../utils/mlService.js"; // This import is here but the createWasteReport is deprecated
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // This import is here but the createWasteReport is deprecated

// NOTE: The `createWasteReport` function below appears to be a duplicate or older version
// of the `reportWaste` function in `residents.controller.js`.
// It is recommended to use `residents.controller.js:reportWaste` for user-initiated reports
// and remove this function to avoid redundancy and potential inconsistencies.
// For now, it's commented out to prevent accidental use.

/*
const createWasteReport = asyncHandler(async (req, res) => {
    const {
        wasteType,
        approximateWeight,
        coordinates,
        address,
        zone
    } = req.body;

    if (!req.file) {
        throw new ApiError(400, "Waste image is required");
    }

    // Upload image to Cloudinary
    const wasteImage = await uploadOnCloudinary(req.file.path);
    if (!wasteImage) {
        throw new ApiError(500, "Failed to upload waste image");
    }

    // Process image with ML model
    const mlResponse = await mlService.detectWaste(req.file.buffer, {
        user_id: req.user._id,
        user_reported_type: wasteType,
        weight: approximateWeight,
        latitude: coordinates[1],
        longitude: coordinates[0]
    });

    // Create waste report
    const wasteReport = await WasteReport.create({
        reportedBy: req.user._id,
        photoUrl: wasteImage.url,
        userReportedType: wasteType,
        mlIdentifiedType: mlResponse.detected_waste[0],
        mlDetails: {
            confidence: mlResponse.confidence,
            recyclable: mlResponse.recyclable,
            energyPotential: mlResponse.energy_potential,
            co2Reduction: mlResponse.co2_reduction,
            allDetections: mlResponse.all_detections,
            fraudDetection: mlResponse.fraud_detection
        },
        approximateWeight,
        coordinates: {
            type: "Point",
            coordinates: coordinates
        },
        address,
        assignedZone: zone,
        status: mlResponse.user_ai_match ? 'useful' : 'unidentified' // Updated status logic
    });

    // If waste is useful and vendors are matched, create processing requests
    if (wasteReport.status === 'useful' && mlResponse.vendor_matching.matched_vendors.length > 0) {
        // Pass the matched vendors directly from ML response
        await createProcessingRequests(wasteReport, mlResponse.vendor_matching.matched_vendors);
    }

    // Update resident's eco-points based on proper waste reporting
    if (wasteReport.status === 'useful') {
        // This function would need to be updated to use the new ML response structure for rewards
        // For now, assuming it handles the old structure or will be refactored
        await updateResidentRewards(req.user._id, approximateWeight, mlResponse.waste_analysis.recyclable);
    }

    return res.status(201).json(
        new ApiResponse(201, wasteReport, "Waste report created successfully")
    );
});
*/

// Helper function to create processing requests for matched vendors
const createProcessingRequests = async (wasteReport, vendorMatches) => {
    const requests = vendorMatches.map(vendor => ({
        wasteReport: wasteReport._id,
        vendor: vendor.id, // Use vendor.id from the ML response's matched_vendors
        status: 'pending_vendor',
        // proposedValue: calculateWasteValue(wasteReport.approximateWeight, wasteReport.mlDetails.energyPotential)
        // You might want to use vendor.estimated_processing_cost from ML response if available
    }));

    if (requests.length > 0) {
        await WasteProcessingRequest.insertMany(requests);
    }
};

// Helper function to calculate waste value (if needed, otherwise rely on ML's market_value)
// function calculateWasteValue(weight, energyPotential) {
//     // Base value calculation logic
//     return weight * (energyPotential / 100) * 10; // Example calculation
// };

// Helper function to update resident rewards (this function is also in residents.controller.js)
// It's better to have a single source of truth for reward calculation.
// This function might be deprecated if residents.controller.js:calculateRewardPoints is used.
/*
const updateResidentRewards = async (residentId, weight, isRecyclable) => {
    const pointsPerKg = isRecyclable ? 10 : 5;
    const points = Math.floor(weight * pointsPerKg);

    await Resident.findByIdAndUpdate(residentId, {
        $inc: { 
            ecoPoints: points, // Assuming ecoPoints is the field
            totalWasteReported: weight,
            recyclableWasteReported: isRecyclable ? weight : 0
        }
    });
};
*/

// Admin/Collector function to get unverified waste reports
const getUnverifiedWaste = asyncHandler(async (req, res, next) => {
    // This function is likely for Admin or a specific role to review 'unidentified' reports
    const unverifiedReports = await WasteReport.find({
        status: 'unidentified', // Assuming 'unidentified' is the status for admin review
        // assignedZone: req.user.assignedZone // Uncomment if filtering by collector/admin zone
    })
    .populate('reportedBy', 'fullName phoneNo address')
    .sort('-createdAt')
    .lean();

    return res.status(200).json(
        new ApiResponse(200, unverifiedReports, "Unverified waste reports fetched successfully")
    );
});

// Admin function to verify a waste report
const verifyWasteReport = asyncHandler(async (req, res, next) => {
    const { reportId, verifiedType, adminNotes } = req.body;

    if (!reportId || !verifiedType) {
        return next(new ApiError(400, "Report ID and verified type are required."));
    }

    // Validate verifiedType against allowed ML types for consistency
    const allowedWasteTypes = ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"];
    if (!allowedWasteTypes.includes(verifiedType)) {
        return next(new ApiError(400, `Invalid waste type: ${verifiedType}. Must be one of ${allowedWasteTypes.join(', ')}`));
    }

    const report = await WasteReport.findById(reportId);
    if (!report) {
        throw new ApiError(404, "Waste report not found");
    }

    // Update report status to 'admin_approved' and set verifiedType
    report.status = 'admin_approved'; // New status after admin approves
    report.mlIdentifiedType = verifiedType; // Admin's verified type
    report.adminNotes = adminNotes || '';
    report.verifiedBy = req.user._id; // Assuming req.user is the admin
    report.verifiedAt = new Date();
    await report.save();

    // Find suitable vendors based on the newly verified waste type
    const vendors = await Vendor.find({
        'requiredWasteTypes': verifiedType,
        'status': 'active' // Assuming vendors have an 'active' status
    }).lean(); // Use lean() for faster retrieval

    // Create processing requests for matched vendors
    // This needs to be adapted to use the actual vendor IDs from the database, not mock data
    const vendorMatchesForProcessing = vendors.map(v => ({
        id: v._id, // Use actual MongoDB _id
        name: v.companyName,
        specialty: v.requiredWasteTypes,
        location: v.processingFacilityLocation.coordinates,
        // Add other relevant vendor details if needed by createProcessingRequests
    }));

    await createProcessingRequests(report, vendorMatchesForProcessing);

    return res.status(200).json(
        new ApiResponse(200, report, "Waste report verified and processing requests created successfully")
    );
});

export {
    // createWasteReport, // Deprecated/Commented out to use residents.controller.js:reportWaste
    getUnverifiedWaste,
    verifyWasteReport
};
