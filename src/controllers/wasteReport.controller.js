import { asyncHandler } from "../utils/asyncHandler.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { Resident } from "../models/resident.model.js";
import { Vendor } from "../models/vendor.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { mlService } from "../utils/mlService.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
        status: mlResponse.user_ai_match ? 'verified' : 'unverified'
    });

    // If waste is verified and vendors are matched, create processing requests
    if (wasteReport.status === 'verified' && mlResponse.vendor_matches.length > 0) {
        await createProcessingRequests(wasteReport, mlResponse.vendor_matches);
    }

    // Update resident's eco-points based on proper waste reporting
    if (wasteReport.status === 'verified') {
        await updateResidentRewards(req.user._id, approximateWeight, mlResponse.recyclable);
    }

    return res.status(201).json(
        new ApiResponse(201, wasteReport, "Waste report created successfully")
    );
});

const createProcessingRequests = async (wasteReport, vendorMatches) => {
    const requests = vendorMatches.map(vendor => ({
        wasteReport: wasteReport._id,
        vendor: vendor.id,
        status: 'pending_vendor',
        proposedValue: calculateWasteValue(
            wasteReport.approximateWeight,
            wasteReport.mlDetails.energyPotential
        )
    }));

    await WasteProcessingRequest.insertMany(requests);
};

const calculateWasteValue = (weight, energyPotential) => {
    // Base value calculation logic
    return weight * (energyPotential / 100) * 10; // Example calculation
};

const updateResidentRewards = async (residentId, weight, isRecyclable) => {
    const pointsPerKg = isRecyclable ? 10 : 5;
    const points = Math.floor(weight * pointsPerKg);

    await Resident.findByIdAndUpdate(residentId, {
        $inc: { 
            ecoPoints: points,
            totalWasteReported: weight,
            recyclableWasteReported: isRecyclable ? weight : 0
        }
    });
};

const getUnverifiedWaste = asyncHandler(async (req, res) => {
    const unverifiedReports = await WasteReport.find({
        status: 'unverified',
        assignedZone: req.user.assignedZone
    })
    .populate('reportedBy', 'fullName phoneNo address')
    .sort('-createdAt');

    return res.status(200).json(
        new ApiResponse(200, unverifiedReports, "Unverified waste reports fetched successfully")
    );
});

const verifyWasteReport = asyncHandler(async (req, res) => {
    const { reportId, verifiedType, adminNotes } = req.body;

    const report = await WasteReport.findById(reportId);
    if (!report) {
        throw new ApiError(404, "Waste report not found");
    }

    // Update report status
    report.status = 'verified';
    report.verifiedType = verifiedType;
    report.adminNotes = adminNotes;
    report.verifiedBy = req.user._id;
    report.verifiedAt = new Date();
    await report.save();

    // Find suitable vendors based on waste type
    const vendors = await Vendor.find({
        'requiredWasteTypes': verifiedType,
        'status': 'active'
    });

    // Create processing requests for matched vendors
    await createProcessingRequests(report, vendors);

    return res.status(200).json(
        new ApiResponse(200, report, "Waste report verified successfully")
    );
});

export {
    createWasteReport,
    getUnverifiedWaste,
    verifyWasteReport
};
