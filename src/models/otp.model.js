import mongoose from "mongoose";



const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otpExpiry: { type: Date, required: true },
});

otpSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });


export const OTP = mongoose.model("OTP", otpSchema);
