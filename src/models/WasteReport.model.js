import { Schema,mongoose } from "mongoose";
const wasteReportSchema = new Schema(
    {
      reportedBy: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
      photoUrl: { type: [String], required: true },
      userReportedType: { type: String, enum: ['plastic', 'paper', 'metal', 'glass', 'organic','trash','other'] },
      mlIdentifiedType: { type: String, enum: ['plastic', 'paper', 'metal', 'glass', 'organic','trash','other'] },
      approximateWeight: Number,
      coordinates: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: [Number]
      },
      assignedZone: { type: String },
      status: {
        type: String,
        enum: ['pending', 'useful', 'unidentified', 'admin_approved', 'collector_assigned'],
        default: 'pending'
      },
      createdAt: { type: Date, default: Date.now }
    }
  );
  wasteReportSchema.index({ coordinates: '2dsphere' });
  export const WasteReport = mongoose.model("WasteReport", wasteReportSchema);