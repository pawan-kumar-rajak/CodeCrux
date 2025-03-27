import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const residentSchema = new Schema(
    {
   
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
            default: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
        },
        phoneNo: {
            type: String,
            required: true,
            trim: true,
        },
        address: { type: Schema.Types.ObjectId, ref: 'Address' },
        rewardCoins: { type: Number, default: 0 },
        wasteReports: [{ type: Schema.Types.ObjectId, ref: 'WasteReport' }],

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

// Password hashing
residentSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Password verification
residentSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// JWT Tokens
residentSchema.methods.generateAccessToken = function () {
    try {
        return jwt.sign(
            {
                _id: this._id,
                email: this.email,
                username: this.username,
                role: "resident",
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
    } catch (error) {
        console.error('Error generating access token:', error);
        throw new Error('Could not generate access token');
    }
};

residentSchema.methods.generateRefreshToken = function () {
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

export const Resident = mongoose.model("Resident", residentSchema);