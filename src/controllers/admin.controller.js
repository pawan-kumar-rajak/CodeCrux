import { ApiError } from "../utils/ApiError.js";
import {
	Admin,
	Admin as User,
} from "../models/admin.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { WasteReport } from "../models/wasteReport.model.js";
import { Resident } from "../models/resident.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { Collector } from "../models/collector.model.js";
import { Vendor } from "../models/vendor.model.js";
import { Bin } from "../models/bin.model.js";
import { parseCoordinates } from "../utils/location_handling.js"; // Ensure parseCoordinates is imported

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        return next( new ApiError(            500,
            "Something went wrong while generating referesh and access token"
        ));

    }
};

const registerUser = async (req, res, next) => {
	let session;
	try {
		// Initialize session
		session = await mongoose.startSession();
		session.startTransaction();
		const { fullName, email, password} = req.body;

        if(!fullName || !email || !password){
            return next(new ApiError(400, "All fields are required"));
        }

		// Check if the user already exists
		const existedUser = await User.findOne({ email: email });
		if (existedUser) {
			return next(new ApiError(409, "User with email already exists"));
		}
	
		// Proceed with user registration
		const user = await User.create(
			[
				{
					fullName,
					email,
					password,
				}
			],
			{ session });

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		// Remove sensitive fields (password, refresh token) before sending response
		const createdUser = await User.findById(user[0]._id);

		// Check if user creation was successful
		if (!createdUser) {
			return next(new ApiError(500, "Something went wrong while registering the Admin"));
		}

		const { accessToken, refreshToken } =
			await generateAccessAndRefereshTokens(createdUser._id);

		// await sendFollowUp(createdUser); // This function seems specific to resident registration

		// Send success response
		return res.status(201).json(
			new ApiResponse(200, { createdUser, accessToken, refreshToken }, "Admin registered successfully")
		);
	} catch (error) {
		if (session) {
			await session.abortTransaction();
			session.endSession();
			console.log("Error in transaction abort for admin registration")
		}
		console.error("Error during admin registration transaction: ", error);
		return next(
			new ApiError(500, "Something went wrong while registering the Admin: " + error.message)
		);
	}
}


const loginUser = async (req, res) => {
    const { email, username, password } = req.body; // username is not in Admin model, assuming email is primary
    
    if (!email || !password) { // Simplified check
        return next( new ApiError(400, "Email and password are required"));

    }

    const user = await User.findOne({ email });

    if (!user) {
        return next( new ApiError(404, "Admin does not exist"));

    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return next( new ApiError(401, "Invalid Admin credentials"));

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
}

const logoutUser = async (req, res) => {
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
}

const refreshAccessToken = async (req, res) => {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            return next( new ApiError(401, "unauthorized request"));

        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken?._id);

            if (!user) {
                return next( new ApiError(401, "Invalid refresh token"));

            }

            if (incomingRefreshToken !== user?.refreshToken) {
                return next( new ApiError(                    401,
                    "Refresh token is expired or used"
                ));

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
            return next( new ApiError(                401,
                error?.message || "Invalid refresh token"
            ));

        }
}



const getAdminProfile = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user._id).select('-password').lean(); // Use lean()
        if (!admin) {
            return next(new ApiError(404, 'Admin not found'));
        }
        
        res.status(200).json(new ApiResponse(200, { user: admin }, 'Admin profile fetched'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching admin profile: ' + error.message));
    }
}

// Get all pending waste reports (unidentified) for admin review
const getAllPendingWasteReports = async (req, res, next) => {
  try {
      const reports = await WasteReport.find({ status: 'unidentified' })
          .populate('reportedBy', 'fullName email phoneNo')
          .populate('assignedBin', 'binId location') // Populate assigned bin info
          .sort({ createdAt: -1 })
          .lean();

      res.status(200).json(new ApiResponse(200, reports, 'Pending waste reports fetched successfully'));
  } catch (error) {
      next(new ApiError(500, 'Error fetching pending waste reports: ' + error.message));
  }
}

const approveWasteReport = async (req, res, next) => {
    const { reportId, wasteType, adminNotes } = req.body;
    
    if (!reportId || !wasteType || !mongoose.Types.ObjectId.isValid(reportId)) {
        return next(new ApiError(400, "Report ID and waste type are required and must be valid."));
    }

    const allowedWasteTypes = ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"];
    if (!allowedWasteTypes.includes(wasteType)) {
        return next(new ApiError(400, `Invalid waste type: ${wasteType}. Must be one of ${allowedWasteTypes.join(', ')}`));
    }
    
    const report = await WasteReport.findById(reportId);
    if (!report) {
        return next(new ApiError(404, 'Waste report not found.'));
    }

    // Update report's ML identified type and status
    report.mlIdentifiedType = wasteType; // Admin's verified type
    report.status = 'assigned_to_bin'; // Set status to assigned_to_bin after admin approval
    report.adminNotes = adminNotes || '';
    report.verifiedBy = req.user._id;
    report.verifiedAt = new Date();
    await report.save();

    // Now, update the associated bin's composition
    if (report.assignedBin) {
        const bin = await Bin.findById(report.assignedBin);
        if (bin) {
            const updatedComposition = new Map(bin.currentWasteComposition);
            const oldMlType = report.mlIdentifiedType; // The type before admin change
            const newMlType = wasteType; // The new type after admin change

            // Adjust composition: remove old type's weight, add to new type's weight
            // This is a complex scenario, assuming the original report's weight contributes to the new type
            // If the admin is changing the type, it implies the original ML was wrong.
            // For simplicity, we'll just add the report's weight to the new type in the bin.
            // A more complex logic might subtract from the old detected type if it was present.

            const existingWeight = updatedComposition.get(newMlType) || 0;
            updatedComposition.set(newMlType, existingWeight + report.approximateWeight);
            
            // If the wasteType of the bin itself needs to be updated based on new composition:
            // bin.wasteType = determineDominantWasteType(updatedComposition);

            await Bin.findByIdAndUpdate(bin._id, {
                $set: {
                    currentWasteComposition: updatedComposition,
                    lastReportedWasteType: newMlType // Update last reported type in bin
                }
            });
            console.log(`Bin ${bin.binId} composition updated after admin approval of report ${reportId}.`);
        }
    } else {
        // If for some reason the report wasn't assigned to a bin, find/create one now
        let targetBin = await Bin.findOne({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: report.coordinates.coordinates },
                    $maxDistance: 5000
                }
            },
            wasteType: { $in: [wasteType, 'mixed'] }
        }).sort({ fillLevel: 1 });

        if (!targetBin) {
            targetBin = await Bin.create({
                binId: `BIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                location: report.coordinates,
                fillLevel: 0,
                wasteType: wasteType,
                assignedZone: report.assignedZone
            });
            console.log(`Created new bin for admin-approved report: ${targetBin.binId}`);
        }

        // Update bin's composition and link report to bin
        const updatedComposition = new Map(targetBin.currentWasteComposition);
        const existingWeight = updatedComposition.get(wasteType) || 0;
        updatedComposition.set(wasteType, existingWeight + report.approximateWeight);

        await Bin.findByIdAndUpdate(targetBin._id, {
            $set: {
                fillLevel: Math.min(targetBin.fillLevel + (report.approximateWeight / 100) * 100, 100), // Assuming 100kg bin capacity
                currentWasteComposition: updatedComposition,
                lastReportedWasteType: wasteType,
                lastCollected: new Date()
            },
            $push: { assignedReports: report._id }
        });
        await WasteReport.findByIdAndUpdate(reportId, { assignedBin: targetBin._id });
    }
  
    res.status(200).json(new ApiResponse(200, report, 'Waste report approved and assigned to bin successfully.'));
}
  
// Modified: Reject waste report (mark for landfill, potentially remove from bin)
const rejectWasteReport = async (req, res, next) => {
    const { reportId, adminNotes } = req.body;
    
    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
        return next(new ApiError(400, "Report ID is required and must be valid."));
    }

    const report = await WasteReport.findById(reportId);
    if (!report) {
        return next(new ApiError(404, 'Waste report not found.'));
    }

     // --- NEW: Award a small bonus for proper disposal ---
    const disposalBonus = 5; // A small reward for responsible disposal
    await Resident.findByIdAndUpdate(report.reportedBy, {
        $inc: { rewardCoins: disposalBonus }
    });
    // --- END NEW LOGIC ---

    // Update report status to 'landfilled'
    report.status = 'landfilled';
    report.adminNotes = adminNotes || '';
    report.verifiedBy = req.user._id;
    report.verifiedAt = new Date();
    await report.save();

    // If the report was assigned to a bin, remove it from the bin's composition
    if (report.assignedBin) {
        const bin = await Bin.findById(report.assignedBin);
        if (bin) {
            const updatedComposition = new Map(bin.currentWasteComposition);
            const currentWeightOfType = updatedComposition.get(report.mlIdentifiedType) || 0;
            updatedComposition.set(report.mlIdentifiedType, Math.max(0, currentWeightOfType - report.approximateWeight));
            
            // Recalculate fill level based on new total weight
            const totalWeightInBin = Object.values(updatedComposition).reduce((sum, val) => sum + val, 0);
            const binCapacity = 100; // Assuming 100kg capacity
            const newFillLevel = (totalWeightInBin / binCapacity) * 100;

            await Bin.findByIdAndUpdate(bin._id, {
                $set: {
                    currentWasteComposition: updatedComposition,
                    fillLevel: newFillLevel
                },
                $pull: { assignedReports: report._id } // Remove report from bin's assignedReports
            });
            console.log(`Report ${reportId} removed from bin ${bin.binId} and marked for landfill.`);
        }
    }

    // Create a processing request directly for landfill for this specific report
    // Or, if you want collectors to pick up from a 'landfill bin', create a request for that bin
    // For simplicity, we'll assume a direct landfill assignment here.
    // A collector would pick this up as a special 'landfill pickup' task.

    // Assign to nearest collector for landfill (if needed, or just mark as landfilled)
    const collector = await Collector.findOneAndUpdate(
        { assignedZone: report.assignedZone }, // Assign to collector in the same zone
        { $push: { assignedPickups: report._id } }, // Pushing the WasteReport ID directly for landfill
        { new: true }
    );

    if (!collector) {
        console.warn(`No collector available in zone ${report.assignedZone} to handle landfill for report ${reportId}.`);
        // Optionally, set report status to 'landfill_unassigned'
        await WasteReport.findByIdAndUpdate(reportId, { status: 'landfill_unassigned' });
        return next(new ApiError(404, 'No collector available in this zone for landfill. Report status updated to unassigned.'));
    }
  
    res.status(200).json(new ApiResponse(200, { report, collector }, 'Waste report rejected and assigned to collector for landfill.'));
}

// Modified: Handle expired processing requests (for Bins)
const handleExpiredRequest = async (req, res, next) => {
  const { requestId } = req.body; // This is a WasteProcessingRequest ID
      
  if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return next(new ApiError(400, "Request ID is required and must be valid."));
  }

  const request = await WasteProcessingRequest.findById(requestId)
                          .populate('bin'); // Populate the bin
  if (!request) {
      return next(new ApiError(404, 'Processing request not found.'));
  }
  if (!request.bin) {
      return next(new ApiError(404, 'Associated bin not found for this request.'));
  }

  // Update request status to 'expired_offer'
  request.status = 'expired_offer';
  await request.save();

  // Update status of all associated WasteReports in this bin to 'awaiting_collection' (if not already)
  // or a new status like 'vendor_rejected_bin' if you want to track that
  await WasteReport.updateMany(
      { assignedBin: request.bin._id, status: { $in: ['awaiting_collection', 'assigned_to_bin'] } },
      { $set: { status: 'awaiting_collection' } } // Revert to awaiting collection for another vendor
  );

  // Optionally, assign this bin to a collector for landfill if it's been rejected multiple times or is old
  // For now, we'll just ensure it's available for other vendors.

  res.status(200).json(new ApiResponse(200, { request }, 'Expired request handled. Bin is now available for other vendors.'));
}

// Modified: Get admin dashboard stats
const getAdminDashboard = async (req, res, next) => {
  try {
      const totalReports = await WasteReport.countDocuments();
      const pendingReports = await WasteReport.countDocuments({ status: 'unidentified' });
      const totalRequests = await WasteProcessingRequest.countDocuments();
      const expiredRequests = await WasteProcessingRequest.countDocuments({ status: 'expired_offer' }); // Use new status
      const pendingApproval = await WasteReport.countDocuments({ status: 'unidentified' });
      const activeCollectors = await Collector.countDocuments({ });
      const registeredUsers = await Resident.countDocuments();
      const totalBins = await Bin.countDocuments(); // New metric
      const fullBins = await Bin.countDocuments({ fillLevel: { $gte: 90 } }); // New metric (e.g., >90% full)

      const dashboardData = {
          totalReports,
          pendingReports,
          totalRequests,
          expiredRequests,
          pendingApproval,
          activeCollectors,
          registeredUsers,
          totalBins, // Add to dashboard data
          fullBins, // Add to dashboard data
          recentReports: await WasteReport.find().sort({ createdAt: -1 }).limit(5).lean(),
          recentRequests: await WasteProcessingRequest.find().sort({ createdAt: -1 }).limit(5).lean()
      };

      res.status(200).json(new ApiResponse(200, dashboardData, 'Admin dashboard data fetched successfully'));
  } catch (error) {
    console.error("Error fetching admin dashboard: ", error);
      next(new ApiError(500, 'Error fetching admin dashboard: ' + error.message));
  }
}


// Get all expired requests (not accepted within 1 day)
const getExpiredRequests = async (req, res, next) => {
  try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const requests = await WasteProcessingRequest.find({
          status: 'pending_vendor',
          createdAt: { $lt: oneDayAgo }
      }).populate('wasteReport vendor').lean(); // Use lean()

      res.status(200).json(new ApiResponse(200, requests, 'Expired requests fetched successfully'));
  } catch (error) {
      next(new ApiError(500, 'Error fetching expired requests: ' + error.message));
  }
}

//get all collector details 
const getCollectors = async(req,res,next)=>{
    const collectors = await Collector.find({}).lean(); // Use lean()
    res.status(200).json(new ApiResponse(200, collectors, 'collectors fetched success'));
}

const getCollectorDetails =  async(req,res,next)=>{
    const {collectorId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(collectorId)) {
        return next(new ApiError(400, "Invalid collector ID format."));
    }
    const collector = await Collector.findById(collectorId).lean(); // Use lean()
    if (!collector) {
        return next(new ApiError(404, "Collector not found."));
    }
    res.status(200).json(new ApiResponse(200, collector, 'collector details fetched successfully'));
}

const getResidentDetails =  async(req,res,next)=>{
    const {ResidentId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(ResidentId)) {
        return next(new ApiError(400, "Invalid Resident ID format."));
    }
    const resident = await Resident.findById(ResidentId).lean(); // Use lean()
    if (!resident) {
        return next(new ApiError(404, "Resident not found."));
    }
    res.status(200).json(new ApiResponse(200, resident, 'Resident details fetched successfully'));
}

const getVendorDetails =  async(req,res,next)=>{
    const {VendorId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(VendorId)) {
        return next(new ApiError(400, "Invalid Vendor ID format."));
    }
    const vendor = await Vendor.findById(VendorId).lean(); // Use lean()
    if (!vendor) {
        return next(new ApiError(404, "Vendor not found."));
    }
    res.status(200).json(new ApiResponse(200, vendor, 'Vendor details fetched successfully'));
}



const createBin = async (req, res, next) => {
    const { binId, location, wasteType, assignedZone } = req.body;
    if (!binId || !location || !location.coordinates || !wasteType || !assignedZone) {
        return next(new ApiError(400, "Bin ID, location (coordinates), waste type, and assigned zone are required."));
    }

    const parsedCoordinates = parseCoordinates(location.coordinates);
    if (!parsedCoordinates || parsedCoordinates.length !== 2) {
        return next(new ApiError(400, "Invalid coordinates format for bin location. Expected [longitude, latitude]."));
    }

    const existingBin = await Bin.findOne({ binId });
    if (existingBin) {
        return next(new ApiError(409, "Bin with this ID already exists."));
    }

    const newBin = await Bin.create({
        binId,
        location: {
            type: "Point",
            coordinates: parsedCoordinates
        },
        wasteType,
        assignedZone,
        fillLevel: 0, // New bins start empty
        currentWasteComposition: {}
    });

    res.status(201).json(new ApiResponse(201, newBin, "Bin created successfully"));
}


// NEW FUNCTION for admin to get details of any waste report
const getReportDetails = async (req, res, next) => {
    const { reportId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return next(new ApiError(400, "Invalid Report ID format."));
    }

    // Find the report and populate the resident's details
    const wasteReport = await WasteReport.findById(reportId)
        .populate('reportedBy', 'fullName phoneNo email') // Populates the 'reportedBy' field with resident info
        .lean();

    if (!wasteReport) {
        return next(new ApiError(404, "Waste report not found."));
    }

    // Structure the response to perfectly match your frontend's expectation
    const responseData = {
        wasteReport: wasteReport,
        resident: wasteReport.reportedBy // The populated resident object
    };

    return res.status(200).json(new ApiResponse(200, responseData, "Report details fetched successfully"));
}


const getAllResidents = async (req, res, next) => {
    // Fetches all residents, excluding sensitive data like passwords.
    const residents = await Resident.find({}).select('-password -refreshToken').lean();

    if (!residents) {
        // This case is unlikely but good for robustness.
        return res.status(200).json(new ApiResponse(200, [], "No residents found."));
    }

    res.status(200).json(new ApiResponse(200, residents, 'All residents fetched successfully'));
}


const getAllVendors = async (req, res, next) => {
    // Fetches all vendors, excluding sensitive data.
    const vendors = await Vendor.find({}).select('-password -refreshToken').lean();

    if (!vendors) {
        return res.status(200).json(new ApiResponse(200, [], "No vendors found."));
    }
    
    res.status(200).json(new ApiResponse(200, vendors, 'All vendors fetched successfully'));
}

// NEW FUNCTION: Aggregates environmental impact data for the admin dashboard.
const getEnvironmentalImpactStats = async (req, res, next) => {
    try {
        // --- Daily Aggregation Pipeline ---
        const dailyStats = await WasteProcessingRequest.aggregate([
            {
                // 1. Filter for only completed and processed requests
                $match: {
                    status: 'processed_by_vendor',
                    'processingCompletionDetails.timestamp': { $exists: true }
                }
            },
            {
                // 2. Group by date (Year, Month, Day)
                $group: {
                    _id: {
                        year: { $year: "$processingCompletionDetails.timestamp" },
                        month: { $month: "$processingCompletionDetails.timestamp" },
                        day: { $dayOfMonth: "$processingCompletionDetails.timestamp" }
                    },
                    // 3. Sum the metrics for each day
                    totalEnergyGenerated: { $sum: "$processingCompletionDetails.energyGenerated" },
                    totalCo2Reduced: { $sum: "$processingCompletionDetails.co2Reduced" },
                    reportsProcessed: { $sum: 1 }
                }
            },
            {
                // 4. Sort by date
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1
                }
            }
        ]);

        // --- Monthly Aggregation Pipeline ---
        const monthlyStats = await WasteProcessingRequest.aggregate([
            {
                $match: {
                    status: 'processed_by_vendor',
                    'processingCompletionDetails.timestamp': { $exists: true }
                }
            },
            {
                // Group by month instead of day
                $group: {
                    _id: {
                        year: { $year: "$processingCompletionDetails.timestamp" },
                        month: { $month: "$processingCompletionDetails.timestamp" }
                    },
                    totalEnergyGenerated: { $sum: "$processingCompletionDetails.energyGenerated" },
                    totalCo2Reduced: { $sum: "$processingCompletionDetails.co2Reduced" },
                    reportsProcessed: { $sum: 1 },
                    
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]);

        // --- Overall Totals ---
        // Calculate total weight processed (by vendor) and total weight landfilled
        const overallStats = await WasteProcessingRequest.aggregate([
            {
            $match: { status: 'processed_by_vendor' }
            },
            {
            $group: {
                _id: null,
                totalEnergyGenerated: { $sum: "$processingCompletionDetails.energyGenerated" },
                totalCo2Reduced: { $sum: "$processingCompletionDetails.co2Reduced" },
                totalReportsProcessed: { $sum: 1 },
                totalWeightProcessed: { $sum: "$requestedWasteWeight" }
            }
            }
        ]);

        // Calculate total weight landfilled (from WasteReports with status 'landfilled')
        const landfilledStats = await WasteReport.aggregate([
            {
            $match: { status: 'landfilled' }
            },
            {
            $group: {
                _id: null,
                totalWeightLandfilled: { $sum: "$requestedWasteWeight" }
            }
            }
        ]);

        // Merge processed and landfilled weights for total weight reduced
        const totalWeightProcessed = overallStats[0]?.totalWeightProcessed || 0;
        const totalWeightLandfilled = landfilledStats[0]?.totalWeightLandfilled || 0;
        const totalWeightReduced = totalWeightProcessed + totalWeightLandfilled;

        // Add to response
        if (overallStats[0]) {
            overallStats[0].totalWeightLandfilled = totalWeightLandfilled;
            overallStats[0].totalWeightReduced = totalWeightReduced;
        } else {
            overallStats[0] = {
            totalEnergyGenerated: 0,
            totalCo2Reduced: 0,
            totalReportsProcessed: 0,
            totalWeightProcessed: 0,
            totalWeightLandfilled,
            totalWeightReduced
            };
        }


        const responseData = {
            overall: overallStats[0] || { totalEnergyGenerated: 0, totalCo2Reduced: 0, totalReportsProcessed: 0 },
            daily: dailyStats,
            monthly: monthlyStats
        };

        return res.status(200).json(new ApiResponse(200, responseData, "Environmental impact stats fetched successfully."));

    } catch (error) {
        return next(new ApiError(500, "Error fetching environmental impact statistics: " + error.message));
    }
}


export{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getAdminProfile,
    getAllPendingWasteReports,
    approveWasteReport,
    rejectWasteReport,
    getExpiredRequests,
    handleExpiredRequest,
    getAdminDashboard,
    getCollectors,
    getCollectorDetails,
    createBin,
    getReportDetails,
    getAllResidents,
    getAllVendors,
    getVendorDetails,
    getResidentDetails,
    getEnvironmentalImpactStats
}
