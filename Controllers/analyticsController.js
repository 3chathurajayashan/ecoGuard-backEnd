import mongoose from "mongoose";

import AnalyticsReport from "../Models/AnalyticsReport.js";
import {
  AnalyticsError,
  CATEGORIES,
  PARKS,
  PERIODS,
  analyze,
  normalizeCriteria,
  overview,
} from "../services/analyticsService.js";
import { EXPORTERS, toDocument } from "../services/reportExporter.js";

const handle = (res, error, label) => {
  if (error instanceof AnalyticsError) {
    return res.status(400).json({ success: false, message: error.message, errors: error.errors });
  }
  console.error(`${label}:`, error);
  return res.status(500).json({ success: false, message: "Something went wrong" });
};

/** Values for the "Select Analysis Criteria" form. */
export const options = (req, res) =>
  res.status(200).json({
    success: true,
    parks: PARKS,
    periods: Object.entries(PERIODS).map(([value, p]) => ({ value, label: p.label })),
    categories: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })),
    formats: Object.keys(EXPORTERS),
  });

export const getOverview = async (req, res) => {
  try {
    return res.status(200).json({ success: true, ...(await overview()) });
  } catch (error) {
    return handle(res, error, "OVERVIEW");
  }
};

export const runAnalysis = async (req, res) => {
  try {
    const results = await analyze(req.body);
    return res.status(200).json({ success: true, results });
  } catch (error) {
    return handle(res, error, "ANALYZE");
  }
};

export const createReport = async (req, res) => {
  try {
    const criteria = normalizeCriteria(req.body.criteria);
    const results = await analyze(criteria);
    const report = await AnalyticsReport.create({
      title: req.body.title?.trim() || "Statistical Conservation Report",
      criteria,
      results,
      generatedBy: req.user.id,
    });
    return res.status(201).json({ success: true, report });
  } catch (error) {
    return handle(res, error, "CREATE REPORT");
  }
};

export const listReports = async (req, res) => {
  try {
    const reports = await AnalyticsReport.find()
      .select("-results")
      .populate("generatedBy", "firstName lastName role")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, count: reports.length, reports });
  } catch (error) {
    return handle(res, error, "LIST REPORTS");
  }
};

const findReport = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid report ID" });
    return null;
  }
  const report = await AnalyticsReport.findById(req.params.id).populate("generatedBy", "firstName lastName role");
  if (!report) {
    res.status(404).json({ success: false, message: "Report not found" });
    return null;
  }
  return report;
};

export const getReport = async (req, res) => {
  try {
    const report = await findReport(req, res);
    if (report) res.status(200).json({ success: true, report });
  } catch (error) {
    handle(res, error, "GET REPORT");
  }
};

/** Update Report: re-run the analysis, optionally with new criteria. */
export const updateReport = async (req, res) => {
  try {
    const report = await findReport(req, res);
    if (!report) return;
    const criteria = normalizeCriteria({ ...report.criteria.toObject(), ...(req.body.criteria ?? {}) });
    report.criteria = criteria;
    report.results = await analyze(criteria);
    report.status = "UPDATED";
    report.lastUpdatedAt = new Date();
    if (req.body.title?.trim()) report.title = req.body.title.trim();
    report.markModified("results");
    await report.save();
    res.status(200).json({ success: true, report });
  } catch (error) {
    handle(res, error, "UPDATE REPORT");
  }
};

/** Export Report: GET /reports/:id/export?format=PDF|CSV|XLSX */
export const exportReport = async (req, res) => {
  try {
    const report = await findReport(req, res);
    if (!report) return;
    const format = String(req.query.format || "PDF").toUpperCase();
    const exporter = EXPORTERS[format];
    if (!exporter) {
      return res.status(400).json({ success: false, message: `format must be one of: ${Object.keys(EXPORTERS).join(", ")}` });
    }
    const file = exporter.build(toDocument(report));
    report.lastExport = { format, at: new Date() };
    await report.save();

    const safe = report.title.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    res.setHeader("Content-Type", exporter.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${safe}.${exporter.ext}"`);
    res.setHeader("Content-Length", file.length);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.status(200).send(file);
  } catch (error) {
    return handle(res, error, "EXPORT REPORT");
  }
};
