const binSchema = new Schema(
    {
      binId: {
        type: String,
        required: true,
        unique: true,
      },
      location: {
        type: String,
        required: true,
      },
      fillLevel: {
        type: Number, // Percentage (0-100)
        default: 0,
      },
      lastCollected: {
        type: Date,
      },
      wasteType: {
        type: String,
        enum: ["mixed", "organic", "recyclable"],
        default: "mixed",
      },
    },
    { timestamps: true }
  );
  
  export const Bin = mongoose.model("Bin", binSchema);