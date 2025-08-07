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
      coordinates: [Number]
    },
    assignedZone: { type: String },
    status: {
      type: String,
      enum: ['pending', 'useful', 'unidentified', 'admin_approved', 'collector_assigned', 'collected', 'delivered'],
      default: 'pending'
    },
    
    mlDetails: {
      confidence: Number,
      recyclable: Boolean,
      energyPotential: Number,
      co2Reduction: Number,
      allDetections: Array,
      fraudDetection: Object
    },
    processingDetails: {
      completedAt: Date,
      energyGenerated: Number,
      co2Reduced: Number
    },
  
      createdAt: { type: Date, default: Date.now }
    }
  );
wasteReportSchema.index({ coordinates: '2dsphere' });
export const WasteReport = mongoose.model("WasteReport", wasteReportSchema);