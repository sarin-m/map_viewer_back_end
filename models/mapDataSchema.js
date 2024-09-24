const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for uploads
const MapDataSchema = new Schema({
  userId: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  latitude: { type: Number, min: -90, max: 90 },  // Validate latitude
  longitude: { type: Number, min: -180, max: 180 } // Validate longitude
});

// Create the model from the schema
const Upload = mongoose.model('MAPDATA', MapDataSchema);

module.exports = Upload;

