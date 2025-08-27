import { Router } from "express";

import{
     registerCollector,
        loginUser,
        logoutUser,
        refreshAccessToken,
        getMyProfile,
        updateLocation,
        getAssignedPickups,
        markAsCollected,
        markAsDelivered,
        getCollectorDashboard,
        getPendingPickupsWithDropoff,
        getWasteDetails,
        getCollectionHistory
} from "../controllers/collector.controller.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

router.post("/register", registerCollector);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh_token", refreshAccessToken);
router.get("/me",verifyJWT, getMyProfile);

router.put("/update_location", verifyJWT, updateLocation);
// router.get("/get_assigned_pickups", verifyJWT, getAssignedPickups);
router.put("/mark_as_collected", verifyJWT, markAsCollected);
router.put("/mark_as_delivered", verifyJWT, markAsDelivered);
router.get("/get_collector_dashboard", verifyJWT, getCollectorDashboard);
router.get("/get_assigned_pickups", verifyJWT,getAssignedPickups);
router.get("/waste/:wasteId", getWasteDetails);
router.get("/get_pending_pickups_with_dropoff", verifyJWT, getPendingPickupsWithDropoff);
router.get("/get_collection_history", verifyJWT, getCollectionHistory);

export default router;
