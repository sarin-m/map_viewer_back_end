const express = require('express');
const router = express.Router();
const Upload = require('../models/mapDataSchema');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// MongoDB URI
const mongoURI = 'mongodb://127.0.0.1:27017/image-upload';

// Create MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/MAPDATA', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// const upload = multer({ storage }); // Initialize multer with GridFS storage

// GET home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/upload-map', async (req, res) => {
  const imageData = req.body.image;
  const { userId } = req.body;
  console.log('point1...')
  if (!imageData) {
    return res.status(400).json({ error: 'No image data provided' });
  }
  console.log('point2...')

  // Strip out the 'data:image/png;base64,' prefix from the image data
  const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
  const uniqueId = uuidv4();
  const fileName = `mapImage_${uniqueId}.png`;

  try {
    fs.writeFileSync(fileName, base64Data, 'base64');
    console.log('user...',userId)
    const newUpload = new Upload({
      userId: userId,
      filePath: fileName,
      latitude: 0,
      longitude: 0,
    });

    // Save the document to MongoDB
    await newUpload.save();

    res.json({ success: true, message: 'Image uploaded and data saved successfully!', fileId: newUpload._id });
    // });
  } catch(e) {
    console.log('error.....',e)
  }

  // Save the image to the local file system

});

// // POST route for uploading images and map data
// router.post('/upload', upload.single('file'), async (req, res) => {
//   console.log('inside....')
//   const { title, description, latitude, longitude } = req.body;
//   console.log('point1.....')
//   // Ensure file upload success
//   if (!req.file) {
//     console.log('point2.....')
//     return res.status(400).json({ error: 'No file uploaded' });
//   }

//   // Save map data along with the reference to the uploaded image
//   const mapData = new MapData({
//     filename: req.file.filename, // GridFS filename
//     fileId: req.file.id, // GridFS file ID
//     title: title || 'Untitled',
//     description: description || 'No description provided',
//     latitude: parseFloat(latitude), // Ensure it's a number
//     longitude: parseFloat(longitude) // Ensure it's a number
//   });
//   console.log('point3.....')

//   try {
//     const savedMapData = await mapData.save();
//     console.log('point4.....')
//     res.json({ file: req.file, mapData: savedMapData });
//   } catch (err) {
//     console.log('point5.....')
//     res.status(500).json({ error: 'Failed to save map data' });
//   }
// });

// Route to get all images for a specific userId
router.get('/images/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Query MongoDB to find all images associated with the userId
    const userImages = await Upload.find({ userId: userId });

    if (!userImages.length) {
      return res.status(404).json({ success: false, message: 'No images found for this user' });
    }

    // Prepare the array to hold image data along with metadata
    const imagesWithBase64 = [];

    // Iterate over each image and read the image file from the file system
    for (const image of userImages) {
      const absoluteFilePath = path.resolve(image.filePath);

      // Check if the file exists
      if (fs.existsSync(absoluteFilePath)) {
        // Read the file and convert it to base64
        const imageData = fs.readFileSync(absoluteFilePath, { encoding: 'base64' });

        // Add image data and metadata to the array
        imagesWithBase64.push({
          _id: image._id,
          userId: image.userId,
          filePath: image.filePath,
          uploadedAt: image.uploadedAt,
          latitude: image.latitude,
          longitude: image.longitude,
          imageBase64: `data:image/png;base64,${imageData}`, // base64 encoded image
        });
      } else {
        console.error(`File not found: ${absoluteFilePath}`);
      }
    }

    // Respond with metadata and base64 image data
    res.json({ success: true, images: imagesWithBase64 });
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch images', error: err });
  }
});

// GET route for fetching images and associated map data by filename
router.get('/image/:filename', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });

    if (!file || file.length === 0) {
      return res.status(404).json({ err: 'No file exists' });
    }

    // Check if the file is an image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Find associated map data
      const mapData = await MapData.findOne({ filename: req.params.filename });

      // Stream the image
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);

      // Optionally, send map data in response headers or in a separate API response
      res.json({ file, mapData });
    } else {
      res.status(404).json({ err: 'Not an image' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Error fetching file or map data' });
  }
});

module.exports = router;
