import { Schema, mongoose } from "mongoose";
const wasteReportSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    photoUrl: { type: [String], required: true },
    userReportedType: { type: String, enum: ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"] },
    mlIdentifiedType: { type: String, enum: ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"] },
    approximateWeight: Number,
    coordinates: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: [Number] // [longitude, latitude]
    },
    assignedZone: { type: String },
    status: {
      type: String,
      enum: [
        'pending',           // Initial status after resident reports
        'unidentified',      // ML mismatch or ML failed, needs admin review
        'assigned_to_bin',   // Successfully assigned to a bin (new status)
        'admin_approved',    // Admin manually approved/classified (now leads to assigned_to_bin)
        'awaiting_collection', // Bin is full/scheduled, waiting for collector to pick up
        'collected_from_bin', // Collector picked up from bin (new status, replaces 'collected')
        'delivered_to_vendor',// Collector delivered to vendor (new status, replaces 'delivered')
        'processed',         // Waste processed by vendor (new status)
        'rejected_by_vendor',// Vendor rejected this specific report (new status)
        'landfilled',        // Sent to landfill (new status)
        'cancelled'          // Report cancelled
      ],
      default: 'pending'
    },
    assignedBin: { // New field: Reference to the Bin this report is associated with
      type: Schema.Types.ObjectId,
      ref: 'Bin'
    },
    mlDetails: {
      confidence: Number,
      recyclable: Boolean,
      energyPotential: Number,
      co2Reduction: Number,
      allDetections: Array,
      fraudDetection: Object,
      vendorMatches: Array // Store matched vendors from ML in report for reference
    },
    processingDetails: { // Details about its lifecycle through processing requests
      completedAt: Date,
      energyGenerated: Number,
      co2Reduced: Number,
      processedByVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
      collectorAssigned: { type: Schema.Types.ObjectId, ref: 'Collector' },
      collectionTimestamp: Date,
      deliveryTimestamp: Date,
      processingMethod: String
    },
    adminNotes: String, // Added for admin review comments
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Admin' }, // Admin who verified
    verifiedAt: Date,
    collectionTimestamp: Date, // When collector marked it collected from bin
    collectedBy: { type: Schema.Types.ObjectId, ref: 'Collector' },
    deliveryTimestamp: Date, // When collector marked it delivered to vendor
    deliveredToVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  },
  { timestamps: true }
);
wasteReportSchema.index({ coordinates: '2dsphere' });
export const WasteReport = mongoose.model("WasteReport", wasteReportSchema);
