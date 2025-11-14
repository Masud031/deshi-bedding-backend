import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  route: { type: String, required: true, unique: true }, // e.g., "/category/panjabi"
  heading: { type: String },
  paragraph: { type: String },
  imageUrl: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Banner", bannerSchema);
