const wasteReportSchema = new Schema(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "Resident",
        required: true,
      },
      wasteType: {
        type: String,
        required: true,
        enum: ["organic", "plastic", "paper", "metal", "e-waste", "other"],
      },
      weight: {
        type: Number, // in kg
        required: true,
      },
      image: {
        type: String, // Cloudinary URL
      },
      status: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "rejected"],
      },
      location: {
        type: String, // Or use GeoJSON for precise coordinates
        required: true,
      },
      pointsEarned: {
        type: Number,
        default: 0, // Calculated based on wasteType and weight
      },
    },
    { timestamps: true }
  );
  
  export const WasteReport = mongoose.model("WasteReport", wasteReportSchema);