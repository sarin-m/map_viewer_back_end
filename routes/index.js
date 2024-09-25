const express = require('express');
const router = express.Router();
const Upload = require('../models/mapDataSchema');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

mongoose.connect('mongodb://127.0.0.1:27017/MAPDATA', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/upload-map', async (req, res) => {
  const imageData = req.body.image;
  const { userId } = req.body;
  if (!imageData) {
    return res.status(400).json({ error: 'No image data provided' });
  }

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

    await newUpload.save();

    res.json({ success: true, message: 'Image uploaded and data saved successfully!', fileId: newUpload._id });
  } catch(e) {
    console.log('error.....',e)
  }

});

router.get('/images/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userImages = await Upload.find({ userId: userId });

    if (!userImages.length) {
      return res.status(404).json({ success: false, message: 'No images found for this user' });
    }

    const imagesWithBase64 = [];

    for (const image of userImages) {
      const absoluteFilePath = path.resolve(image.filePath);

      if (fs.existsSync(absoluteFilePath)) {
        const imageData = fs.readFileSync(absoluteFilePath, { encoding: 'base64' });

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

    res.json({ success: true, images: imagesWithBase64 });
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch images', error: err });
  }
});

module.exports = router;
