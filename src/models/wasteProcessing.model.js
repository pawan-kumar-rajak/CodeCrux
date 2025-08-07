import { Schema, mongoose } from "mongoose";
const wasteProcessingRequestSchema = new Schema({
  wasteReport: { type: Schema.Types.ObjectId, ref: 'WasteReport', required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  collector: { type: Schema.Types.ObjectId, ref: 'Collector' },
  status: {
    type: String,
    enum: ['pending_vendor', 'accepted', 'rejected', 'expired'],
    default: 'pending_vendor'
  },

  energyMetrics: {
    generated: Number,
    co2Reduced: Number,
    timestamp: Date
  },
  processingStatus: String,
  collectionDetails: {
    timestamp: Date,
    location: {
      type: String,
      coordinates: [Number]
    }
  },

  createdAt: { type: Date, default: Date.now }
});

export const WasteProcessingRequest = mongoose.model("WasteProcessingRequest", wasteProcessingRequestSchema);