import mongoose from "mongoose";

// Address Schema
const addressSchema = new mongoose.Schema({
	customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'customer', required: true },
	coordinates: {
		type: { type: String, default: 'Point', enum: ['Point'] },
		coordinates: { type: [Number], required: true }, // [longitude, latitude]
	},
	addressLine: { type: String, required: true },
	city: { type: String, required: true },
	state: { type: String, required: true },
	country: { type: String, required: true },
	postalCode: { type: String, required: true }},{ timestamps: true });

addressSchema.index({ 'currentLocation.coordinates': '2dsphere' });

export const Address = mongoose.model("Address", addressSchema)

