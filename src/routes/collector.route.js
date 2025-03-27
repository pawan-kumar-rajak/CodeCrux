import { Router } from "express";

import{
     registerCollector,
        loginUser,
        logoutUser,
        refreshAccessToken,
    
        updateLocation,
        getAssignedPickups,
        markAsCollected,
        markAsDelivered,
        getCollectorDashboard
} from "../controllers/collector.controller.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

router.post("/register", registerCollector);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh_token", refreshAccessToken);

router.post("/update_location", verifyJWT, updateLocation);
router.get("/get_assigned_pickups", verifyJWT, getAssignedPickups);
router.post("/mark_as_collected", verifyJWT, markAsCollected);
router.post("/mark_as_delivered", verifyJWT, markAsDelivered);
router.get("/get_collector_dashboard", verifyJWT, getCollectorDashboard);

export default router;
