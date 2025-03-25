import mongoose from "mongoose";

// Address Schema
const addressSchema = new mongoose.Schema({
	customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'customer', required: true },
	currentLocation: {
		type: { type: String, default: 'Point', enum: ['Point'] },
		coordinates: { type: [Number], required: true }, // [longitude, latitude]
	},
	// previousLocations: [
	// 	{
	// 		coordinates: { type: [Number], required: true }, // [longitude, latitude]
	// 		timestamp: { type: Date, default: Date.now },
	// 	},
	// ],
}, { timestamps: true });

addressSchema.index({ 'currentLocation.coordinates': '2dsphere' });

export const Address = mongoose.model("Address", addressSchema)

