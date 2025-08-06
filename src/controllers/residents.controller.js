import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
	Resident,
	Resident as User,
} from "../models/resident.model.js";
import {
	uploadOnCloudinary,
	deleteImageFromCloudinary,
	MultiUploadOnCloudinary,
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
import path from "path";
import axios from "axios";
import FormData from "form-data";

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
const send_registrer_Otp = asyncHandler(async (req, res, next) => {
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
});

const sendForgotPasswordOTP = asyncHandler(async (req, res, next) => {
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
});


const change_email_otp = asyncHandler(async (req, res, next) => {
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
});

//verify OTP
const verifyOtp = asyncHandler(async (req, res, next) => {
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
});


const registerUser = asyncHandler(async (req, res, next) => {
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
				userId: user[0]._id,
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
});


const loginUser = asyncHandler(async (req, res, next) => {
	// req body -> data
	// username or email
	//find the user
	//password check
	//access and referesh token
	//send cookie

	const { email, username, password } = req.body;
	

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

	const user = await User.findOne({email:email
	});
	

	if (!user) {
		return next(new ApiError(404, "User does not exist"))
	}

	const isPasswordValid = await user.isPasswordCorrect(
		password
	);

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

const changeCurrentPassword = asyncHandler(
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
);

const getCurrentUser = asyncHandler(async (req, res) => {
	// Fetch user details from the database (assuming user is already attached to req.user)
	const user = await Customer.findById(req.user.id).exec();

	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	// Fetch the address associated with the user from the Address schema
	const address = await Address.findOne({ user: req.user.id, role: 'Customer', isDefault: true }).exec();

	// Clone the user object to safely add the address
	const userWithAddress = user.toObject(); // Convert the Mongoose document to a plain JavaScript object

	// Attach the address to the cloned object
	userWithAddress.address = address; // Add the address field to the user object

	// Return the updated user object with the address
	return res.status(200).json(
		new ApiResponse(200, userWithAddress, "User fetched successfully")
	);
});


const updateAccountDetails = asyncHandler(
	async (req, res) => {
		const { fullName, email } = req.body;

		if (!fullName || !email) {
			throw new ApiError(400, "All fields are required");
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
);

const updateUserAvatar = asyncHandler(async (req, res) => {
	const avatarLocalPath = req.file?.path;

	if (!avatarLocalPath) {
		throw new ApiError(400, "Avatar file is missing");
	}

	//TODO: delete old image - assignment

	const avatar = await uploadOnCloudinary(avatarLocalPath);

	if (!avatar.url) {
		throw new ApiError(
			400,
			"Error while uploading on avatar"
		);
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
});



const reportWaste = async (req, res, next) => {
    try {
        const { userReportedType, approximateWeight, assignedZone, longitude, latitude } = req.body;
        const residentId = req.user._id;
        const coordinates = [longitude, latitude];

        // Validate files were uploaded
        if (!req.files || req.files.length === 0) {
            return next(new ApiError(400, "At least one image is required."));
        }

      
      
        // 2. Now process with ML API using the original file
        let mlIdentifiedType = userReportedType;
        let detectedWasteTypes = [];
        let isRecyclable = false;

        try {
            // Use the first file that's still available in memory
            const file = req.files[0];

			console.log("files", req.files);
            
            // Verify file exists before processing
            if (!fs.existsSync(file.path)) {
                console.warn(`File not found: ${file.path}`);
                return next(new Error('Temporary file not available for ML processing'))
            }

            const form = new FormData();
            form.append('image', fs.createReadStream(file.path));

            const detectionResponse = await axios.post('http://localhost:3000/detect', form, {
                headers: form.getHeaders(),
                timeout: 5000000 // 5 second timeout
            });

            if (detectionResponse.data.success) {
                detectedWasteTypes = detectionResponse.data.detected_waste;
                isRecyclable = detectionResponse.data.recyclable;

                // Find best matching type
                const normalizedUserType = userReportedType.toLowerCase();
                mlIdentifiedType = detectedWasteTypes.find(type => 
                    type.toLowerCase().includes(normalizedUserType)
                ) || detectedWasteTypes[0] || userReportedType;
            }
        } catch (mlError) {
            console.error('ML Processing Error:', mlError.message);
			
			
            // Continue with user-reported type if ML fails
        }

		const uploadedImages = await MultiUploadOnCloudinary(
            req.files.map((file) => file.path),
            'Waste'
        );

        if (uploadedImages.length === 0) {
            return next(new ApiError(500, "Failed to upload images to Cloudinary."));
        }


        // Create the report
        const newReport = await WasteReport.create({
            reportedBy: residentId,
            photoUrl: uploadedImages,
            userReportedType,
            mlIdentifiedType,
            approximateWeight,
            coordinates: {
                type: 'Point',
                coordinates: parseCoordinates(coordinates)
            },
            status: detectedWasteTypes.some(t => 
                t.toLowerCase().includes(userReportedType.toLowerCase())
            ) ? 'useful' : 'unidentified',
            assignedZone,
            mlDetails: {
                detectedWasteTypes,
                isRecyclable,
                detectionSuccess: detectedWasteTypes.length > 0
            }
        });

        // Update resident
        await Resident.findByIdAndUpdate(residentId, {
            $push: { wasteReports: newReport._id }
        });

        // Cleanup: Delete temporary files
        req.files.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up file:', file.path, cleanupError);
            }
        });

        res.status(201).json(new ApiResponse(201, newReport, 'Report submitted'));

    } catch (error) {
        console.error("Report Error:", error);
        next(new ApiError(500, error.message || 'Report submission failed'));
    }
};



// Get resident dashboard stats
const getResidentDashboard = async (req, res, next) => {
	try {
		const resident = await Resident.findById(req.user._id)
			.populate('wasteReports')
			.populate('address').sort({createdAt: -1});

		const totalReports = resident.wasteReports.length;
		const totalRewards = resident.rewardCoins;
		const pendingReports = resident.wasteReports.filter(report => report.status === 'pending').length;

		const dashboardData = {
			totalReports,
			totalRewards,
			pendingReports,
			recentReports: resident.wasteReports.slice(0, 25)
		};

		res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard data fetched successfully'));
	} catch (error) {
		next(new ApiError(500, 'Error fetching resident dashboard'));
	}
};

// Get all waste reports by resident
const getMyWasteReports = async (req, res, next) => {
	try {
		const reports = await WasteReport.find({ reportedBy: req.user._id })
			.sort({ createdAt: -1 });

		res.status(200).json(new ApiResponse(200, reports, 'Waste reports fetched successfully'));
	} catch (error) {
		next(new ApiError(500, 'Error fetching waste reports'));
	}
};



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
	getResidentDashboard,
	getMyWasteReports,

};
