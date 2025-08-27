import { Schema, mongoose } from "mongoose";
const wasteProcessingRequestSchema = new Schema({
  // Changed from wasteReport to bin, as requests are now for bins
  bin: { type: Schema.Types.ObjectId, ref: 'Bin', required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  collector: { type: Schema.Types.ObjectId, ref: 'Collector' },
  status: {
    type: String,
    enum: [
      'pending_vendor_offer', // Vendor offered to process this bin
      'vendor_accepted',    // Vendor accepted bin contents
      'collector_assigned', // Collector assigned to pick up bin
      'collected_from_bin', // Collector picked up bin contents
      'delivered_to_vendor',// Collector delivered bin contents to vendor
      'processed_by_vendor',// Vendor processed the bin contents
      'rejected_by_vendor', // Vendor rejected the bin contents
      'expired_offer',      // Vendor offer expired
      'cancelled'           // Request cancelled
    ],
    default: 'pending_vendor_offer'
  },
  // New fields to track quantity and type of waste in this request
  requestedWasteWeight: { type: Number, default: 0 },
  requestedWasteType: { type: String, enum: ["mixed", "organic waste", "plastic waste", "paper waste", "metal waste", "glass waste", "E-waste", "automobile wastes", "battery waste", "light bulbs"] },

  energyMetrics: { // Metrics from processing this specific request
    generated: Number, // Total energy generated from this bin's contents
    co2Reduced: Number, // Total CO2 reduced from this bin's contents
    timestamp: Date
  },
  collectionDetails: { // When collector picked up from bin
    timestamp: Date,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number] // [longitude, latitude]
    }
  },
  deliveryDetails: { // When collector delivered to vendor
    timestamp: Date,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number] // [longitude, latitude]
    }
  },
  processingCompletionDetails: { // When vendor marked processing complete
    timestamp: Date,
    methodUsed: String,
    energyGenerated: Number,
    co2Reduced: Number
  },
  createdAt: { type: Date, default: Date.now }
});

export const WasteProcessingRequest = mongoose.model("WasteProcessingRequest", wasteProcessingRequestSchema);
