import { Schema,mongoose } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/ApiError.js";
const adminSchema = new Schema(
    {
      fullName: {
        type: String,
        required: true,
      },

      avatar: {
        type: String,
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

      refreshToken: {
        type: String,
      },
    },
    { timestamps: true }
  );
  
  adminSchema.pre("save", async function (next) {
      if (!this.isModified("password")) return next();
      this.password = await bcrypt.hash(this.password, 10);
      next();
  });
  
  // Password verification
  adminSchema.methods.isPasswordCorrect = async function (password) {
      return await bcrypt.compare(password, this.password);
  };
  
  // JWT Tokens
  adminSchema.methods.generateAccessToken = function () {
      try {
          return jwt.sign(
              {
                  _id: this._id,
                  email: this.email,
                  role: "Admin",
              },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
          );
      } catch (error) {
          console.error('Error generating access token:', error);
          throw new ApiError(500, 'Could not generate access token');
      }
  };
  
  adminSchema.methods.generateRefreshToken = function () {
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
  
  export const Admin = mongoose.model("Admin", adminSchema);