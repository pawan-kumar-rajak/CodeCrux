import {Schema,mongoose} from "mongoose";

// Address Schema
const addressSchema = new Schema({
	addressLine1: String,
	addressLine2: String,
	city: String,
	state: String,
	postalCode: String,
	country: String,
	location: {
		type: {
			type: String,
			enum: ['Point'],
			required: true
		},
		coordinates: {
			type: [Number],
			required: true
		}
	}
});

addressSchema.index({ location: '2dsphere' });

export const Address = mongoose.model("Address", addressSchema)

