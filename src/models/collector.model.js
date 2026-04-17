import { Schema,mongoose } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/ApiError.js";
const collectorSchema = new Schema(
    {
      employeeId: {
        type: String,
        required: true,
        unique: true,
      },
      fullName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      assignedZone: {
        type: String, // e.g., "North District"
        required: true,
      },
      role: {
        type: String,
        default: "collector",
      },
      refreshToken: {
        type: String,
      },
      phoneNo:{
        type:String,
        required:true
      },
      vehicleNo:{
        type:String
      },
      vehicleType:{
        type:String,
        enum: ["Truck", "Van", "Auto Rickshaw", "Bicycle", "Cart", "other"]
      },
      currentLocation: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
      },
      assignedPickups: [{ type: Schema.Types.ObjectId, ref: 'WasteProcessingRequest' }]
    },
    { timestamps: true }
  );

  collectorSchema.index({ currentLocation: '2dsphere' });
  
  collectorSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Password verification
collectorSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// JWT Tokens
collectorSchema.methods.generateAccessToken = function () {
    try {
        return jwt.sign(
            {
                _id: this._id,
                email: this.email,
                employeeId:this.employeeId,
                fullName:this.fullName,
                role: "collector",
                assignedZone: this.assignedZone,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
    } catch (error) {
        console.error('Error generating access token:', error);
        throw new ApiError(500, 'Could not generate access token');
    }
};

collectorSchema.methods.generateRefreshToken = function () {
    try {
        return jwt.sign(
            {
                _id: this._id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY
            }
        );
    } catch (error) {
        console.error('Error generating refresh token:', error);
        throw new ApiError(500, 'Could not generate refresh token');
    }
};
  
  export const Collector = mongoose.model("Collector", collectorSchema);