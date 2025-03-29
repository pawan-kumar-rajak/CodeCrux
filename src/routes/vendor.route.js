import { Router } from "express";   
import {
    registerVendor,
    loginUser,
    logoutUser,
    refreshAccessToken,
    
    getAvailableWaste,
    requestWasteCollection,
    getVendorDashboard,
    rejectWasteRequest,
    viewGarbageDetails
} from "../controllers/vendor.controller.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";


const router = Router();

router.post("/register", registerVendor);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh_token", refreshAccessToken);

router.get("/get_available_waste", verifyJWT, getAvailableWaste);
router.post("/request_waste_collection", verifyJWT, requestWasteCollection);
router.get("/get_vendor_dashboard", verifyJWT, getVendorDashboard);
router.post("/reject_waste_request", verifyJWT, rejectWasteRequest);
router.get("/view_garbage_details/:garbageId", verifyJWT, viewGarbageDetails);
export default router;