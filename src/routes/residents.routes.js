import { Router } from "express";
import {
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
	getWasteDetails,
	deleteWasteReport 
} from "../controllers/residents.controller.js";
import { MultiUpload, upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

router.post("/send_registrer_otp", send_registrer_Otp);
router.post("/send_forgot_password_otp", sendForgotPasswordOTP);
router.post("/verify_otp", verifyOtp);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT,logoutUser);
router.post("/refresh_token", refreshAccessToken);
router.post("/change_current_password", verifyJWT, changeCurrentPassword);
router.get("/current_user", verifyJWT, getCurrentUser);
router.post("/update_account_details", verifyJWT, updateAccountDetails);
router.post("/update_user_avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.post("/report-waste", verifyJWT, MultiUpload, reportWaste);
router.get("/dashboard", verifyJWT, getResidentDashboard);
router.get("/waste-history", verifyJWT, getMyWasteReports);
router.get("/waste-details/:wasteId", verifyJWT, getWasteDetails);
router.delete("/delete-report/:reportId", verifyJWT, deleteWasteReport);
	
export default router;
