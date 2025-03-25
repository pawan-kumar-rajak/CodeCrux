import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import residentRoutes from "./routes/residents.routes.js";
import { uploadOnCloudinary } from "./utils/cloudinary.js";
import http from "http";
import axios from "axios";
const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.static("public"));
app.use('/public', express.static('public'))
app.use(cookieParser());


app.use("/api/v1/residents", residentRoutes);
app.get("/postoffices/nearby", async (req, res) => {
	const { zipcode } = req.query; // Use req.query to retrieve the zipcode
	if (!zipcode) {
		return res
			.status(400)
			.json({ error: "Zipcode is required" });
	}

	try {
		const response = await axios.get(
			`https://api.postalpincode.in/pincode/${zipcode}`
		);
		const postOffices = response.data[0].PostOffice || [];
		res.json({ success: true, data: postOffices });
	} catch (error) {
		console.error("Error fetching post offices:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error" });
	}
});

export { app };
