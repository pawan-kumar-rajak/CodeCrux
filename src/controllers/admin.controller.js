import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
	Admin,
	Admin as User,
} from "../models/admin.model.js";
import {
	uploadOnCloudinary,
	deleteImageFromCloudinary,
	MultiUploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Bin } from "../models/bin.model.js";
import { WasteReport } from "../models/wasteReport.model.js";
import { Resident } from "../models/resident.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";
import { Collector } from "../models/collector.model.js";

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

const registerUser = asyncHandler(async (req, res, next) => {
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

		await sendFollowUp(createdUser);

		// Send success response
		return res.status(201).json(
			new ApiResponse(200, { createdUser, accessToken, refreshToken }, "User registered successfully")
		);
	} catch (error) {
		if (session) {
			await session.abortTransaction();
			session.endSession();
			console.log("error in abort")
		}
		console.error("Error during transaction: ", error);
		return next(
			new ApiError(500, "Something went wrong while registering the User")
		);
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


const getAdminProfile = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user._id).select('-password');
        if (!admin) {
            return next(new ApiError(404, 'Admin not found'));
        }
        
        res.status(200).json(new ApiResponse(200, { user: admin }, 'Admin profile fetched'));
    } catch (error) {
        next(new ApiError(500, 'Error fetching admin profile'));
    }
};

// Get all pending waste reports (unidentified)
const getAllPendingWasteReports = async (req, res, next) => {
  try {
      const reports = await WasteReport.find({ status: 'unidentified' })
          .populate('reportedBy', 'fullName email phoneNo');

      res.status(200).json(new ApiResponse(200, reports, 'Pending waste reports fetched successfully'));
  } catch (error) {
      next(new ApiError(500, 'Error fetching pending waste reports'));
  }
};

// Approve waste report as useful
// Update the approve controller to include validation
const approveWasteReport = async (req, res, next) => {
    try {
        const { reportId, wasteType } = req.body;
        
        // Validate waste type
        const validTypes = ['plastic', 'paper', 'metal', 'glass', 'organic', 'E-waste', 'other'];
        if (!validTypes.includes(wasteType)) {
            return next(new ApiError(400, 'Invalid waste type'));
        }
        
        const report = await WasteReport.findByIdAndUpdate(reportId, {
            status: 'admin_approved',
            userReportedType: wasteType,
            mlIdentifiedType: wasteType
        }, { new: true });
  
        if (!report) {
            return next(new ApiError(404, 'Report not found'));
        }
  
        // Add to approved waste collection
        await CollectionCenter.findOneAndUpdate(
            { zone: report.assignedZone },
            { $push: { approvedWaste: report._id } }
        );
  
        res.status(200).json(new ApiResponse(200, report, 'Waste report approved successfully'));
    } catch (error) {
        next(new ApiError(500, 'Error approving waste report'));
    }
  };
  
  // Update the reject controller to include notifications
  const rejectWasteReport = async (req, res, next) => {
    try {
        const { reportId } = req.body;
        
        const report = await WasteReport.findByIdAndUpdate(reportId, {
            status: 'collector_assigned'
        }, { new: true });
  
        if (!report) {
            return next(new ApiError(404, 'Report not found'));
        }
  
        // Assign to nearest collector
        const collector = await Collector.findOneAndUpdate(
            { assignedZone: report.assignedZone },
            { 
                $push: { 
                    assignedPickups: report._id,
                    notifications: {
                        type: 'new_assignment',
                        message: `New landfill pickup assigned in ${report.assignedZone}`,
                        reportId: report._id
                    }
                } 
            },
            { new: true }
        );
  
        if (!collector) {
            return next(new ApiError(404, 'No collector available in this zone'));
        }
  
        // Send notification to collector (you would implement your notification system)
        sendPushNotification(collector.fcmToken, {
            title: 'New Landfill Assignment',
            body: `You have been assigned a new pickup in ${report.assignedZone}`
        });
  
        res.status(200).json(new ApiResponse(200, { report, collector }, 'Waste report rejected and assigned to collector'));
    } catch (error) {
        next(new ApiError(500, 'Error rejecting waste report'));
    }
  };

// Get all expired requests (not accepted within 1 day)
const getExpiredRequests = async (req, res, next) => {
  try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const requests = await WasteProcessingRequest.find({
          status: 'pending_vendor',
          createdAt: { $lt: oneDayAgo }
      }).populate('wasteReport vendor');

      res.status(200).json(new ApiResponse(200, requests, 'Expired requests fetched successfully'));
  } catch (error) {
      next(new ApiError(500, 'Error fetching expired requests'));
  }
};

// Handle expired request (assign to collector for landfill)
const handleExpiredRequest = async (req, res, next) => {
  try {
      const { requestId } = req.body;
      
      const request = await WasteProcessingRequest.findByIdAndUpdate(requestId, {
          status: 'expired'
      }, { new: true });

      if (!request) {
          return next(new ApiError(404, 'Request not found'));
      }

      // Update waste report status
      await WasteReport.findByIdAndUpdate(request.wasteReport, {
          status: 'collector_assigned'
      });

      // Assign to nearest collector
      const collector = await Collector.findOneAndUpdate(
          { assignedZone: request.wasteReport.assignedZone },
          { $push: { assignedPickups: request._id } },
          { new: true }
      );

      if (!collector) {
          return next(new ApiError(404, 'No collector available in this zone'));
      }

      res.status(200).json(new ApiResponse(200, { request, collector }, 'Expired request handled successfully'));
  } catch (error) {
      next(new ApiError(500, 'Error handling expired request'));
  }
};

// Get admin dashboard stats
const getAdminDashboard = async (req, res, next) => {
  try {
      const totalReports = await WasteReport.countDocuments();
      const pendingReports = await WasteReport.countDocuments({ status: 'unidentified' });
      const totalRequests = await WasteProcessingRequest.countDocuments();
      const expiredRequests = await WasteProcessingRequest.countDocuments({ status: 'expired' });
      const pendingApproval = await WasteReport.countDocuments({ status: 'unidentified' });
    //   const activeCollectors = await Collector.countDocuments({ status: 'active' });
      const activeCollectors = await Collector.countDocuments({ });
      const registeredUsers = await Resident.countDocuments();
      

      const dashboardData = {
          totalReports,
          pendingReports,
          totalRequests,
          expiredRequests,
          pendingApproval,
          activeCollectors,
          registeredUsers,
          recentReports: await WasteReport.find().sort({ createdAt: -1 }).limit(5),
          recentRequests: await WasteProcessingRequest.find().sort({ createdAt: -1 }).limit(5)
      };

      res.status(200).json(new ApiResponse(200, dashboardData, 'Admin dashboard data fetched successfully'));
  } catch (error) {
    console.log("error: ", error)
      next(new ApiError(500, 'Error fetching admin dashboard'));
  }
};

//get all collector details 
const getCollectors = asyncHandler(async(req,res,next)=>{

    const collectors = await Collector.find({});

    res.status(200).json(new ApiResponse(200, collectors, 'collectors fetched success'));
})

const getCollectorDetails =  asyncHandler(async(req,res,next)=>{

    const {collectorId} = req.params
    const collectors = await Collector.findById(collectorId);

    res.status(200).json(new ApiResponse(200, collectors, 'collectors fetched success'));
})


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
    getCollectorDetails
}