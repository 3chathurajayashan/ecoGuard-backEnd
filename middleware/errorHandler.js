const errorHandler = (err, req, res, _next) => {
  console.error("Error:", err.message || err);
  
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. Maximum size is 50MB." });
  }
  
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ success: false, message: "Too many files." });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

export default errorHandler;
