import { ApiError } from "../utils/ApiError.js";
import {
	Resident,
	Resident as User,
} from "../models/resident.model.js";
import {
	uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { OTP } from "../models/otp.model.js";
import { sendOTPs, sendFollowUp } from "../utils/Mail.js";
import { Address } from "../models/address.model.js";
import mongoose from "mongoose";
import { parseCoordinates, AddressFromPincode } from "../utils/location_handling.js";
import { Bin } from "../models/bin.model.js"; 
import { WasteReport } from "../models/wasteReport.model.js";
import fs from "fs";
import { mlService } from "../utils/mlService.js"; 

import { Vendor } from "../models/vendor.model.js";
import { WasteProcessingRequest } from "../models/wasteProcessing.model.js";


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

//send OTP functionality
const send_registrer_Otp = async (req, res, next) => {
	const { email } = req.body;

	if (!email) {
		return next(new ApiError(400, "Email is required"));
	}

	const existedUser = await User.findOne({ email });
	if (existedUser) {
		throw new ApiError(409, 'User already existed ');
	}

	const otp = Math.random()
		.toString(36)
		.substring(2, 8)
		.toUpperCase(); // 6-character OTP
	const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

	// Send OTP via email
	await sendOTPs(email, "Your OTP Code", otp, "This OTP is valid for 10 minutes");

	// Save OTP to DB
	const existingOtp = await OTP.findOne({ email });
	if (existingOtp) {
		existingOtp.otp = otp;
		existingOtp.otpExpiry = otpExpiry;
		await existingOtp.save();
	} else {
		await OTP.create({ email, otp, otpExpiry });
	}

	res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{},
				`otp sent successfully to ${email}`
			)
		);
}

const sendForgotPasswordOTP = async (req, res, next) => {
	const { email } = req.body;

	if (!email || email.trim() === "") {
		return next(new ApiError(400, "Email is required"));
	}

	// Check if user exists
	const user = await User.findOne({ email });
	if (!user) {
		return next(new ApiError(404, "User with this email does not exist"));
	}

	// Generate OTP and expiry time
	const otp = Math.random()
		.toString(36)
		.substring(2, 8)
		.toUpperCase(); // 6-character OTP
	const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

	// Save OTP in database
	await OTP.findOneAndUpdate(
		{ email },
		{ otp, otpExpiry },
		{ upsert: true, new: true }
	);

	// Send OTP via email
	const subject = "Reset Your Password - OTP Verification";
	const validty = `This OTP is valid for 10 minutes.`;
	await sendOTPs(email, subject, otp, validty)

	res.status(200).json(
		new ApiResponse(200, {}, "OTP sent to your email successfully")
	);
}


const change_email_otp = async (req, res, next) => {
	const { email } = req.body;

	if (!email || email.trim() === "") {
		return next(new ApiError(400, "Email is required"));
	}

	// Check if user exists
	const user = await User.findOne({ email });
	if (!user) {
		return next(new ApiError(404, "User with this email does not exist"));
	}

	// Generate OTP and expiry time
	const otp = Math.random()
		.toString(36)
		.substring(2, 8)
		.toUpperCase(); // 6-character OTP
	const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

	// Save OTP in database
	await OTP.findOneAndUpdate(
		{ email },
		{ otp, otpExpiry },
		{ upsert: true, new: true }
	);

	// Send OTP via email
	const subject = "EMAIL verification - OTP Verification";
	const validty = `This OTP is valid for 10 minutes.`;
	await sendOTPs(email, subject, otp, validty)

	res.status(200).json(
		new ApiResponse(200, {}, "OTP sent to your email successfully")
	);
}

//verify OTP
const verifyOtp = async (req, res, next) => {
	const { email, otp } = req.body;

	if (!email || !otp) {
		return next(new ApiError(400, "Email and OTP are required"));
	}

	const otpRecord = await OTP.findOne({ email });
	if (
		!otpRecord ||
		otpRecord.otp !== otp ||
		otpRecord.otpExpiry < Date.now()
	) {
		return next(new ApiError(400, "Invalid or expired OTP"));
	}

	await OTP.deleteOne({ email }); // Prevent OTP reuse
	res
		.status(200)
		.json(
			new ApiResponse(200, {}, "OTP verified successfully")
		);
}


const registerUser = async (req, res, next) => {
	let session;
	try {
		// Initialize session
		session = await mongoose.startSession();
		session.startTransaction();

		// Extract fields from request body
		const { fullName, email, password, phoneNo, otp, addressLine, pincode, coordinates } = req.body;

		// Input validation
		if (!fullName || !email || !password || !phoneNo || !addressLine || !pincode || !coordinates) {
			return next(new ApiError(400, "All fields are required"));
		}

		// Check if the user already exists
		const existedUser = await User.findOne({ email: email });
		if (existedUser) {
			return next(new ApiError(409, "User with email already exists"));
		}

		// Call postal API to fetch city, state, and country from the pincode
		let { city, state, country } = await AddressFromPincode(pincode);

		// Parse coordinates
		let parsedCoordinates = parseCoordinates(coordinates);

		// Proceed with user registration
		const user = await User.create(
			[{
				fullName,
				email,
				password,
				phoneNo
			}],
			{ session }
		);

		// Create the address entry within the transaction
		const newAddress = await Address.create(
			[{
				userId: user[0]._id, // Assuming userId is a field in Address schema
				addressLine,
				city,
				state,
				country,
				postalCode: pincode,
				location: { type: "Point", coordinates: parsedCoordinates }
			}],
			{ session }
		);

		// Link address to the user
		user[0].address = newAddress[0]._id;
		await user[0].save({ session });

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		// Remove sensitive fields (password) before sending response
		const createdUser = await User.findById(user[0]._id).populate('address');

		// Check if user creation was successful
		if (!createdUser) {
			return next(new ApiError(500, "Something went wrong while registering the user"));
		}

		const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(createdUser._id);

		await sendFollowUp(createdUser);

		// Send success response
		return res.status(201).json(
			new ApiResponse(200, { createdUser, accessToken, refreshToken }, "User registered successfully")
		);

	} catch (error) {
		if (session) {
			await session.abortTransaction();
			session.endSession();
		}
		console.error("Error during transaction: ", error);
		return next(new ApiError(500, "Something went wrong while registering the User"));
	}
}

const loginUser = async (req, res, next) => {
	const { email, username, password } = req.body;

	if (!(username || email)) {
		throw new ApiError(
			400,
			"username or email is required"
		);
	}

	const user = await User.findOne({ email: email });

	if (!user) {
		return next(new ApiError(404, "User does not exist"))
	}

	const isPasswordValid = await user.isPasswordCorrect(password);

	if (!isPasswordValid) {
		return next(new ApiError(401, "Invalid user credentials"))
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
				"User logged In Successfully"
			)
		);
}

const logoutUser = async (req, res) => {
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$unset: {
				refreshToken: 1,
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

const refreshAccessToken = 
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

const changeCurrentPassword = 
	async (req, res) => {
		const { oldPassword, newPassword } = req.body;

		const user = await User.findById(req.user?._id);
		const isPasswordCorrect = await user.isPasswordCorrect(
			oldPassword
		);

		if (!isPasswordCorrect) {
			throw new ApiError(400, "Invalid old password");
		}

		user.password = newPassword;
		await user.save({ validateBeforeSave: false });

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					{},
					"Password changed successfully"
				)
			);
	}

const getCurrentUser = async (req, res,next) => {
	
	const user = await User.findById(req.user.id).exec();
	if (!user) {
		return next(new ApiError(404, "User not found"));
	}

	
	const address = await Address.findById(user.address).exec(); 

	
	const userWithAddress = user.toObject(); 


	userWithAddress.address = address;

	
	return res.status(200).json(
		new ApiResponse(200, userWithAddress, "User fetched successfully")
	);
}


const updateAccountDetails = 
	async (req, res,next) => {
		const { fullName, email } = req.body;

		if (!fullName || !email) {
			return next( new ApiError(400, "All fields are required"))
		}

		const user = await User.findByIdAndUpdate(
			req.user?._id,
			{
				$set: {
					fullName,
					email: email,
				},
			},
			{ new: true }
		).select("-password");

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					user,
					"Account details updated successfully"
				)
			);
	}

const updateUserAvatar = async (req, res,next) => {
	const avatarLocalPath = req.file?.path;

	if (!avatarLocalPath) {
		return next( new ApiError(400, "Avatar file is missing"))
	}

	// TODO: delete old image - assignment (This is a good reminder for future implementation)

	const avatar = await uploadOnCloudinary(avatarLocalPath);

	if (!avatar.url) {
		return next( new ApiError(
			400,
			"Error while uploading on avatar"
		))
	}

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				avatar: avatar.url,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				user,
				"Avatar image updated successfully"
			)
		);
}



// Modified: Main function for residents to report waste
const reportWaste = async (req, res, next) => {
	let imagePath = null;
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const { userReportedType, approximateWeight, assignedZone, longitude, latitude } = req.body;
		const residentId = req.user._id;
		const coordinates = [parseFloat(longitude), parseFloat(latitude)]; // Ensure coordinates are numbers

		if (!req.files || req.files.length === 0) {
			return next(new ApiError(400, "At least one image is required."));
		}
		if (!userReportedType || !approximateWeight || !assignedZone || isNaN(longitude) || isNaN(latitude)) {
			return next(new ApiError(400, "All required fields (waste type, weight, zone, coordinates) must be provided."));
		}

		const file = req.files[0];
		imagePath = file.path; // Multer saves the file temporarily here

		let mlResponseData = null;
		try {
			console.log("Calling external Python ML service for detection...");
			mlResponseData = await mlService.detectWaste(file.path, {
				user_id: residentId.toString(),
				user_reported_type: userReportedType,
				weight: parseFloat(approximateWeight),
				latitude: parseFloat(latitude),
				longitude: parseFloat(longitude)
			});
			console.log("External ML Service Response:", mlResponseData);

			if (!mlResponseData.success) {
				console.warn('External ML Service reported failure:', mlResponseData.message || 'Unknown ML error');
			}
		} catch (mlError) {
			console.error('External ML Service Processing Error:', mlError.message);
			mlResponseData = {
				success: false,
				message: `ML detection failed: ${mlError.message}`,
				detection_results: { detected_waste: [], all_detections: [], highest_confidence: 0, total_objects_detected: 0 },
				waste_analysis: { recyclable: false, waste_details: {} }
			};
		}

		// 2. Perform fraud detection in Express.js
		const fraudDetection = await detectFraud({
			userId: residentId,
			wasteType: mlResponseData.detection_results.detected_waste[0] || userReportedType,
			weight: parseFloat(approximateWeight),
			location: [parseFloat(latitude), parseFloat(longitude)],
			timestamp: new Date()
		});
		console.log("fraud detection: ", fraudDetection)

		// 3. Perform vendor matching in Express.js
		const matchedVendors = await matchVendors({
			wasteType: mlResponseData.detection_results.detected_waste[0] || userReportedType,
			weight: parseFloat(approximateWeight),
			location: [parseFloat(latitude), parseFloat(longitude)]
		});

		// Calculate energy metrics based on waste type
		const mlIdentifiedType = mlResponseData.detection_results.detected_waste[0] || userReportedType;
		const wasteDetails = mlResponseData.waste_analysis.waste_details || {
			energy_potential: 0,
			co2_reduction: 0,
			market_value: 0
		};

		const energyPotential = Math.round(approximateWeight * wasteDetails.energy_potential * 100) / 100;
		const co2Reduction = Math.round(approximateWeight * wasteDetails.co2_reduction * 100) / 100;
		const processingCostEstimate = Math.round(approximateWeight * wasteDetails.market_value * 100) / 100;
		const userAiMatch = mlResponseData.detection_results.detected_waste[0];
		// 2. Upload image(s) to Cloudinary (after ML processing, using Multer's temp file)
		const uploadedImages = await MultiUploadOnCloudinary(
			req.files.map((f) => f.path),
			'Waste'
		);
		if (uploadedImages.length === 0) {
			await session.abortTransaction();
			session.endSession();
			return next(new ApiError(500, "Failed to upload images to Cloudinary."));
		}

		// 3. Find the nearest suitable Bin or create one (simplified)
		let targetBin = await Bin.findOne({
			location: {
				$near: {
					$geometry: {
						type: "Point",
						coordinates: coordinates // [longitude, latitude]
					},
					$maxDistance: 500 // Search within 5 km for a suitable bin
				}
			},
			wasteType: { $in: [mlIdentifiedType, 'mixed'] }
		}).sort({ fillLevel: 1 }).session(session); // Prefer less full bins

		let binCreationMessage = '';
		if (!targetBin) {
			targetBin = await Bin.create([{
				binId: `BIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
				location: { type: "Point", coordinates: coordinates },
				fillLevel: 0,
				wasteType: mlIdentifiedType || 'mixed',
				assignedZone: assignedZone
			}], { session });
			targetBin = targetBin[0];
			console.log(`Created new bin: ${targetBin.binId}`);
			binCreationMessage = `No nearby bin found. A new virtual bin (${targetBin.binId}) has been created for your waste.`;
		}

		// 4. Update the Bin's fill level and waste composition
		const currentFillLevel = targetBin.fillLevel;
		const binCapacity = 100; // Assume 100kg capacity for simplicity
		const weightPercentage = (approximateWeight / binCapacity) * 100;
		let newFillLevel = currentFillLevel + weightPercentage;
		newFillLevel = Math.min(newFillLevel, 100);

		const updatedComposition = new Map(targetBin.currentWasteComposition);
		const existingWeight = updatedComposition.get(mlIdentifiedType) || 0;
		updatedComposition.set(mlIdentifiedType, existingWeight + parseFloat(approximateWeight));

		await Bin.findByIdAndUpdate(targetBin._id, {
			$set: {
				fillLevel: newFillLevel,
				currentWasteComposition: updatedComposition,
				lastReportedWasteType: mlIdentifiedType,
				lastCollected: new Date()
			},
			$push: { assignedReports: residentId }
		}, { new: true, session });

		// 5. Create the WasteReport with reference to the assigned Bin
		let reportStatus = 'assigned_to_bin';
		if (!mlResponseData.success || !userAiMatch) {
			reportStatus = 'unidentified';
		}
		if(userAiMatch != userReportedType){
			reportStatus = 'unidentified'
		}

		const newReport = await WasteReport.create([{
			reportedBy: residentId,
			photoUrl: uploadedImages,
			userReportedType,
			mlIdentifiedType,
			approximateWeight: parseFloat(approximateWeight),
			coordinates: { type: 'Point', coordinates: coordinates },
			status: reportStatus,
			assignedZone,
			assignedBin: targetBin._id,
			mlDetails: {
				confidence: mlResponseData.detection_results.highest_confidence,
				recyclable: mlResponseData.waste_analysis.recyclable,
				energyPotential: energyPotential,
				co2Reduction: co2Reduction,
				allDetections: mlResponseData.detection_results.allDetections,
				fraudDetection: fraudDetection,
				vendorMatches: matchedVendors
			}
		}], { session });
		const createdReport = newReport[0];

		// 6. Update resident's rewards
		const reportingReward = 10;
		await Resident.findByIdAndUpdate(residentId, {
			$push: { wasteReports: createdReport._id },
			$inc: { rewardCoins: reportingReward }
		}, { session });

		await session.commitTransaction();
		session.endSession();

		// Cleanup: Delete temporary files from Multer's upload directory
		if (imagePath && fs.existsSync(imagePath)) {
			try { fs.unlinkSync(imagePath); } catch (cleanupError) { console.error('Error cleaning up temporary file:', imagePath, cleanupError); }
		}

		let finalMessage = `Waste report submitted and assigned to bin ${targetBin.binId}! You earned ${reportingReward} points.`;
		if (binCreationMessage) {
			finalMessage = binCreationMessage + ' ' + finalMessage;
		}
		if (reportStatus === 'unidentified') {
			finalMessage += ' Your report needs admin review due to AI mismatch or uncertainty.';
		}
		console.log("report submitted successfully")
		return res.status(201).json(
			new ApiResponse(
				201,
				{
					report: createdReport,
					mlAnalysis: mlResponseData, // Return the full ML analysis to the frontend
					processingCostEstimate,
					rewardPoints: reportingReward,
					assignedBin: targetBin,
					message: finalMessage
				},
				"Waste report created successfully"
			)
		);

	} catch (error) {
		if (session) {
			await session.abortTransaction();
			session.endSession();
		}
		console.error('Error in reportWaste:', error);
		if (imagePath && fs.existsSync(imagePath)) {
			try { fs.unlinkSync(imagePath); } catch (cleanupError) { console.error('Error cleaning up temporary file in error handler:', imagePath, cleanupError); }
		}
		return next(new ApiError(500, "Error creating waste report: " + error.message));
	}
};


const deleteWasteReport = async (req, res, next) => {
    const { reportId } = req.params;
    const residentId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return next(new ApiError(400, "Invalid Waste Report ID."));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Step 1: Find the report and verify the user is the owner.
        const report = await WasteReport.findById(reportId).session(session);
        if (!report) {
            throw new ApiError(404, "Waste report not found.");
        }
        if (report.reportedBy.toString() !== residentId.toString()) {
            throw new ApiError(403, "You are not authorized to delete this report.");
        }

        // Step 2: Check if the report is in a deletable state.
        const deletableStatuses = ['pending', 'unidentified', 'assigned_to_bin'];
        if (!deletableStatuses.includes(report.status)) {
            return next( new ApiError(400, `Cannot delete report. It is already in the '${report.status}' stage.`))
        }

        // Step 3: As an extra safeguard, check if a collector has been dispatched for the bin.
        if (report.assignedBin) {
            const activeRequest = await WasteProcessingRequest.findOne({
                bin: report.assignedBin,
                status: { $in: ['collector_assigned', 'collected_from_bin', 'delivered_to_vendor'] }
            }).session(session);

            if (activeRequest) {
                throw new ApiError(400, "Cannot delete report. A collector is already on the way for this bin.");
            }
        }

        // Step 4: Deduct the initial 10 reward points and remove the report from the resident's list.
        const reportingReward = 10;
        await Resident.findByIdAndUpdate(residentId, {
            $inc: { rewardCoins: -reportingReward },
            $pull: { wasteReports: report._id }
        }, { session });

        // Step 5: Adjust the assigned bin's metrics.
        if (report.assignedBin) {
            const bin = await Bin.findById(report.assignedBin).session(session);
            if (bin) {
                // Remove the report's weight from the composition map.
                const reportWeight = report.approximateWeight;
                const reportType = report.mlIdentifiedType || report.userReportedType;
                const currentWeight = bin.currentWasteComposition.get(reportType) || 0;
                const newWeight = Math.max(0, currentWeight - reportWeight);

                if (newWeight > 0) {
                    bin.currentWasteComposition.set(reportType, newWeight);
                } else {
                    bin.currentWasteComposition.delete(reportType);
                }

                // Recalculate the bin's fill level.
                const binCapacity = 100; // Assuming 100kg capacity.
                const newTotalWeight = Array.from(bin.currentWasteComposition.values()).reduce((sum, val) => sum + val, 0);
                bin.fillLevel = (newTotalWeight / binCapacity) * 100;
                
                // Remove the report from the bin's reference array.
                bin.assignedReports.pull(report._id);
                await bin.save({ session });
            }
        }

        // Step 6: Delete the report document itself.
        await WasteReport.findByIdAndDelete(reportId).session(session);
        
        // Note: Logic to delete images from Cloudinary would go here.

        // If all steps succeed, commit the transaction.
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(new ApiResponse(200, {}, "Waste report has been successfully deleted."));

    } catch (error) {
        // If any step fails, roll back all changes.
        await session.abortTransaction();
        session.endSession();
        return next(error); // Pass error to your global error handler.
    }
}


// Get resident dashboard stats
// Modified: Get resident dashboard stats
const getResidentDashboard = async (req, res, next) => {
	try {
		const residentId = req.user._id;

		const resident = await Resident.findById(residentId)
			.populate({
				path: 'wasteReports',
				options: { sort: { createdAt: -1 }, limit: 10 },
				populate: { path: 'assignedBin', select: 'binId location' } // Populate assigned bin info
			})
			.lean();

		if (!resident) {
			return next(new ApiError(404, "Resident not found"));
		}

		const totalReports = resident.wasteReports?.length || 0;
		// Pending reports now include 'pending', 'unidentified', 'assigned_to_bin', 'awaiting_collection'
		const pendingReports = resident.wasteReports?.filter(report =>
			['pending', 'unidentified', 'assigned_to_bin', 'awaiting_collection'].includes(report.status)
		).length || 0;

		let totalEnergyGenerated = 0;
		let totalCo2Reduced = 0;

		if (resident.wasteReports && resident.wasteReports.length > 0) {
			resident.wasteReports.forEach(report => {
				// Only sum up if processing details are available (means it was processed)
				if (report.processingDetails && typeof report.processingDetails.energyGenerated === 'number') {
					totalEnergyGenerated += report.processingDetails.energyGenerated;
				}
				if (report.processingDetails && typeof report.processingDetails.co2Reduced === 'number') {
					totalCo2Reduced += report.processingDetails.co2Reduced;
				}
			});
		}

		const recentReports = resident.wasteReports?.map(report => ({
			_id: report._id,
			userReportedType: report.userReportedType,
			mlIdentifiedType: report.mlIdentifiedType,
			approximateWeight: report.approximateWeight,
			status: report.status,
			assignedZone: report.assignedZone,
			photoUrl: report.photoUrl,
			coordinates: report.coordinates,
			createdAt: report.createdAt,
			mlDetails: report.mlDetails || {},
			assignedBin: report.assignedBin ? {
				_id: report.assignedBin._id,
				binId: report.assignedBin.binId,
				location: report.assignedBin.location.coordinates // Return coordinates
			} : null
		})) || [];

		//waste report types stats
		const reportTypes = {};
		resident.wasteReports?.forEach(report => {
			reportTypes[report.userReportedType] = (reportTypes[report.userReportedType] || 0) + 1;
		});

		//waste report status stats
		const reportStatuses = {};
		resident.wasteReports?.forEach(report => {
			reportStatuses[report.status] = (reportStatuses[report.status] || 0) + 1;
		});

		//waste report zones stats
		const reportZones = {};
		resident.wasteReports?.forEach(report => {
			reportZones[report.assignedZone] = (reportZones[report.assignedZone] || 0) + 1;
		});

		//day wise waste report 
		const reportDays = {};
		resident.wasteReports?.forEach(report => {
			const date = new Date(report.createdAt).toLocaleDateString();
			reportDays[date] = (reportDays[date] || 0) + 1;
		});

		const dashboardData = {
			totalRewards: resident.rewardCoins || 0,
			totalReports,
			pendingReports,
			energyGenerated: Math.round(totalEnergyGenerated),
			co2Reduced: Math.round(totalCo2Reduced),
			reports: recentReports,
			reportTypes,
			reportStatuses,
			reportZones,
			reportDays
		};

		return res.status(200).json(
			new ApiResponse(200, dashboardData, "Dashboard data fetched successfully")
		);

	} catch (error) {
		console.error('Error fetching dashboard:', error);
		return next(new ApiError(500, "Error fetching dashboard data: " + error.message));
	}
};

// MODIFIED FUNCTION: Now includes the bin's current collection status for better tracking.
const getWasteDetails = async (req, res, next) => {
	try {
		const { wasteId } = req.params;
		const residentId = req.user._id;

		const wasteReport = await WasteReport.findById(wasteId)
			.populate('reportedBy', 'fullName phoneNo email')
			.populate('assignedBin', 'binId location fillLevel wasteType')
			.lean();

		if (!wasteReport) {
			return next(new ApiError(404, "Waste report not found"));
		}

		if (wasteReport.reportedBy._id.toString() !== residentId.toString()) {
			return next(new ApiError(403, "Access denied. You can only view your own reports."));
		}

		// --- NEW: Find the active processing request for the report's bin ---
		let currentProcessingRequest = null;
		if (wasteReport.assignedBin) {
			currentProcessingRequest = await WasteProcessingRequest.findOne({
				bin: wasteReport.assignedBin._id,
				status: { $nin: ['processed_by_vendor', 'rejected_by_vendor', 'expired_offer', 'cancelled'] }
			})
				.populate('collector', 'fullName employeeId')
				.populate('vendor', 'companyName')
				.select('status collector vendor collectionDetails deliveryDetails')
				.lean();
		}
		// --- END NEW ---

		const wasteDetails = {
			_id: wasteReport._id,
			userReportedType: wasteReport.userReportedType,
			mlIdentifiedType: wasteReport.mlIdentifiedType,
			approximateWeight: wasteReport.approximateWeight,
			status: wasteReport.status,
			photoUrl: wasteReport.photoUrl,
			coordinates: wasteReport.coordinates,
			createdAt: wasteReport.createdAt,
			mlDetails: wasteReport.mlDetails || {},
			assignedBin: wasteReport.assignedBin,
			processingDetails: wasteReport.processingDetails || null,
			currentCollectionStatus: currentProcessingRequest 
		};

		return res.status(200).json(
			new ApiResponse(200, wasteDetails, "Waste details fetched successfully")
		);

	} catch (error) {
		console.error('Error fetching waste details:', error);
		return next(new ApiError(500, "Error fetching waste details: " + error.message));
	}
};
// Get all waste reports by resident
const getMyWasteReports = async (req, res, next) => {
	try {
		const reports = await WasteReport.find({ reportedBy: req.user._id })
			.sort({ createdAt: -1 })
			.lean(); 

		res.status(200).json(new ApiResponse(200, reports, 'Waste reports fetched successfully'));
	} catch (error) {
		next(new ApiError(500, 'Error fetching waste reports'));
	}
};



// Fraud detection utility
async function detectFraud({ userId, wasteType, weight, location, timestamp }) {
	try {
		const recentActivities = await WasteReport.find({
			reportedBy: userId,
			createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
		}).sort({ createdAt: -1 }).limit(50);

		if (recentActivities.length < 5) {
			return {
				is_suspicious: false,
				suspicion_score: 0,
				details: { message: 'Insufficient history for full fraud detection' }
			};
		}

		// 1. Rapid reporting check (last hour)
		const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);
		const recentCount = recentActivities.filter(r => r.createdAt > oneHourAgo).length;
		const rapidReporting = recentCount >= 5; // More than 5 reports in last hour

		// 2. Weight anomaly check (last 10 reports)
		const recentWeights = recentActivities.slice(0, 10).map(r => r.approximateWeight);
		let weightAnomaly = false;
		let zScore = 0;

		if (recentWeights.length > 3) {
			const mean = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
			const stdDev = Math.sqrt(recentWeights.map(w => Math.pow(w - mean, 2)).reduce((a, b) => a + b, 0) / recentWeights.length);
			if (stdDev > 0) {
				zScore = Math.abs((weight - mean) / stdDev);
				weightAnomaly = zScore > 3.0;
			}
		}

		// 3. Location jump check
		let locationJump = false;
		if (recentActivities.length >= 2) {
			const lastReport = recentActivities[0];
			const distance = calculateHaversineDistance(location, [
				lastReport.coordinates.coordinates[1],
				lastReport.coordinates.coordinates[0]
			]);
			const timeDiffHours = (timestamp - lastReport.createdAt) / (1000 * 60 * 60);
			locationJump = distance > 10 && timeDiffHours < 1;
		}

		const suspicionScore = [rapidReporting, weightAnomaly, locationJump].filter(Boolean).length / 3;

		return {
			is_suspicious: suspicionScore > 0.5,
			suspicion_score: suspicionScore,
			details: {
				rapid_reporting: rapidReporting,
				recent_reports_count: recentCount,
				weight_anomaly: weightAnomaly,
				z_score: zScore,
				location_jump: locationJump
			}
		};

	} catch (error) {
		console.error('Fraud detection error:', error);
		return {
			is_suspicious: false,
			suspicion_score: 0,
			details: { error: error.message }
		};
	}
}

// Vendor matching utility
async function matchVendors({ wasteType, weight, location }) {
	try {
		const vendors = await Vendor.find({
			requiredWasteTypes: { $regex: new RegExp(wasteType, 'i') },
			'processingFacilityLocation.coordinates': { $exists: true }
		}).limit(100); // Limit to prevent memory issues

		const suitableVendors = vendors.map(v => {
			const vendorLocation = v.processingFacilityLocation.coordinates;
			const distance = calculateHaversineDistance(
				location,
				[vendorLocation[1], vendorLocation[0]] // Convert [lng,lat] to [lat,lng]
			);

			const capacity = v.capacity || 10000;
			const processed = v.wasteProcessed || 0;
			const available = capacity - processed;

			if (available < weight) return null;

			const capacityScore = Math.min(available / weight, 5) / 5;
			const distanceScore = Math.max(0, 1 - distance / 100);
			const ratingScore = (v.rating || 3) / 5;
			const efficiencyScore = (v.energy_efficiency || 70) / 100;

			const matchScore = (
				capacityScore * 0.3 +
				distanceScore * 0.3 +
				ratingScore * 0.25 +
				efficiencyScore * 0.15
			);

			return {
				id: v._id.toString(),
				name: v.companyName,
				specialty: v.requiredWasteTypes,
				capacity: v.capacity,
				current_load: v.wasteProcessed,
				location: vendorLocation,
				rating: v.rating,
				processing_method: v.processingMethod,
				price_per_kg: v.price_per_kg || 10,
				certifications: v.certifications || [],
				processing_time: v.processing_time || 'N/A',
				energy_efficiency: v.energy_efficiency || 70,
				distance_km: Math.round(distance * 100) / 100,
				match_score: Math.round(matchScore * 1000) / 1000,
				available_capacity: available,
				estimated_processing_cost: Math.round(weight * (v.price_per_kg || 10) * 100) / 100
			};
		}).filter(v => v !== null && v.distance_km <= 100);

		return suitableVendors.sort((a, b) => b.match_score - a.match_score).slice(0, 3);

	} catch (error) {
		console.error('Vendor matching error:', error);
		return [];
	}
}

// Haversine distance calculation
function calculateHaversineDistance(loc1, loc2) {
	const R = 6371; // Earth radius in km
	const [lat1, lon1] = loc1.map(deg => deg * Math.PI / 180);
	const [lat2, lon2] = loc2.map(deg => deg * Math.PI / 180);

	const dLat = lat2 - lat1;
	const dLon = lon2 - lon1;

	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);

	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


export {
	send_registrer_Otp,
	sendForgotPasswordOTP,
	verifyOtp,
	registerUser,
	loginUser,
	logoutUser,
	refreshAccessToken,
	changeCurrentPassword,
	getCurrentUser,
	updateAccountDetails,
	updateUserAvatar,

	reportWaste,
	deleteWasteReport,
	getResidentDashboard,
	getMyWasteReports,
	getWasteDetails,
};
