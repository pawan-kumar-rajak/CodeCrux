import { Router } from "express";
import {
	
} from "../controllers/residents.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

	
export default router;
