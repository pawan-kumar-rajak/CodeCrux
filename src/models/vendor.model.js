import {Schema,mongoose} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const vendorSchema = new Schema({
    companyName: { type: String, required: true },
    licenseNo: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    requiredWasteTypes: { 
      type: [String], 
      enum:["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"],
      required: true 
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    processingMethod: {
      type: String,
      enum: ["torrefaction", "recycling", "composting", "pyrolysis"],
      required: true
    },
    avatar: { type: String, default: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png" },
    energyProduced: { type: Number, default: 0 }, // in kWh
    co2Reduced: { type: Number, default: 0 }, // in kg
    wasteProcessed: { type: Number, default: 0 }, // in kg
    certifications: [String],
  
    processingFacilityLocation: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: [Number]
      }
  }, { timestamps: true });


  // Password hashing
  vendorSchema.pre("save", async function (next) {
      if (!this.isModified("password")) return next();
      this.password = await bcrypt.hash(this.password, 10);
      next();
  });
  
  // Password verification
  vendorSchema.methods.isPasswordCorrect = async function (password) {
      return await bcrypt.compare(password, this.password);
  };
  
  // JWT Tokens
  vendorSchema.methods.generateAccessToken = function () {
      try {
          return jwt.sign(
              {
                  _id: this._id,
                  email: this.email,
                  licenseNo: this.licenseNo,
                  role: "vendor",
              },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
          );
      } catch (error) {
          console.error('Error generating access token:', error);
          throw new Error('Could not generate access token');
      }
  };
  
  vendorSchema.methods.generateRefreshToken = function () {
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
          throw new Error('Could not generate refresh token');
      }
  };

  export const Vendor = mongoose.model("Vendor", vendorSchema); 