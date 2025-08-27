import { Schema, mongoose } from "mongoose";

const binSchema = new Schema(
    {
      binId: {
        type: String,
        required: true,
        unique: true,
      },
      location: {
        type: { type: String, enum: ['Point'], required: true }, // Changed to GeoJSON Point
        coordinates: { type: [Number], required: true } // [longitude, latitude]
      },
      assignedZone:{
        type: String,
      },
      fillLevel: {
        type: Number, // Percentage (0-100)
        default: 0,
      },
      lastCollected: {
        type: Date,
      },
      wasteType: { // Primary type of waste this bin is designated for (e.g., "organic", "recyclable", "mixed")
        type: String,
        enum: ["mixed", "organic waste", "plastic waste", "paper waste", "metal waste", "glass waste", "E-waste", "automobile wastes", "battery waste", "light bulbs"], // Expanded types
        default: "mixed",
      },
      currentWasteComposition: { // To store aggregated waste types and weights within the bin
        type: Map, // Map of wasteType -> totalWeight (e.g., { "plastic waste": 50, "organic waste": 20 })
        of: Number,
        default: {}
      },
      assignedReports: [{ // Array of WasteReport IDs that have been assigned to this bin
        type: Schema.Types.ObjectId,
        ref: 'WasteReport'
      }],
      lastReportedWasteType: { // The last type of waste reported to this bin
        type: String,
        enum: ["mixed", "organic waste", "plastic waste", "paper waste", "metal waste", "glass waste", "E-waste", "automobile wastes", "battery waste", "light bulbs"],
      },
    },
    { timestamps: true }
);

binSchema.index({ location: '2dsphere' }); // Ensure geospatial index for location

export const Bin = mongoose.model("Bin", binSchema);
