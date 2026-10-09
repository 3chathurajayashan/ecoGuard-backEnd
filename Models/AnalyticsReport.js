import mongoose from "mongoose";

const REPORT_STATUS = ["DRAFT", "GENERATED", "UPDATED"];
const REPORT_FORMAT = ["PDF", "CSV", "XLSX"];

const analyticsReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    reportType: { type: String, default: "STATISTICAL" },
    status: { type: String, enum: REPORT_STATUS, default: "GENERATED" },
    criteria: {
      park: { type: String, required: true },
      period: { type: String, required: true },
      categories: [{ type: String }],
    },
    // The analysis results as they were when the report was generated
    results: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastUpdatedAt: { type: Date, default: null },
    lastExport: {
      format: { type: String, enum: [...REPORT_FORMAT, null], default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export { REPORT_STATUS, REPORT_FORMAT };
const AnalyticsReport =
  mongoose.models.AnalyticsReport || mongoose.model("AnalyticsReport", analyticsReportSchema);
export default AnalyticsReport;
