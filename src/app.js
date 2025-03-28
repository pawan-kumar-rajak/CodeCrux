import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import residentRoutes from "./routes/residents.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import vendorRoutes from "./routes/vendor.route.js";
import collectorRoutes from "./routes/collector.route.js";
import { uploadOnCloudinary } from "./utils/cloudinary.js";
import http from "http";
import axios from "axios";
import { ApiError } from "./utils/ApiError.js";
const app = express();
app.use(express.json())
app.use(
	cors()
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.static("public"));
app.use('/public', express.static('public'))
app.use(cookieParser());


app.use("/api/v1/residents", residentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/vendor", vendorRoutes);
app.use("/api/v1/collector", collectorRoutes);



//todo:  Handle API Errors - Ensure JSON Response
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors || [],
        });
    }

    // Fallback for unknown errors
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
});

export { app };
