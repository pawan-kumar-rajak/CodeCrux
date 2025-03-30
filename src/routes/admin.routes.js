import { Router } from "express";
import { MultiUpload, upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getAllPendingWasteReports,
    approveWasteReport,
    rejectWasteReport,
    getExpiredRequests,
    handleExpiredRequest,
    getAdminDashboard,
    getAdminProfile,
    getCollectors,
    getCollectorDetails
} from "../controllers/admin.controller.js";


const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh_token", refreshAccessToken);
router.get("/get_all_pending_waste_reports", verifyJWT, getAllPendingWasteReports);
router.post("/approve_waste_report", verifyJWT, approveWasteReport);
router.post("/reject_waste_report", verifyJWT, rejectWasteReport);
router.get("/get_admin_dashboard", verifyJWT, getAdminDashboard);
router.get("/me", verifyJWT, getAdminProfile);
router.get("/get_expired_requests", verifyJWT, getExpiredRequests);
router.post("/handle_expired_request", verifyJWT, handleExpiredRequest);
router.get("/get_collectors", verifyJWT, getCollectors);
router.get("/get_collector/:collectorId", verifyJWT, getCollectorDetails);



export default router;