const express = require('express');
const router = express.Router();
const Upload = require('../models/mapDataSchema');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

console.log('process.env.MONGODB_CONNECT_URI....',process.env.MONGODB_CONNECT_URI);
console
mongoose.connect(`${process.env.MONGODB_CONNECT_URI}:${process.env.PORT}/MAPDATA`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/upload-map', async (req, res) => {
  const imageData = req.body.image;
  const { userId, selectedPosition } = req.body;
  console.log('selectedPosition....',selectedPosition)
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
      latitude: selectedPosition.lat,
      longitude: selectedPosition.lng,
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

// router.get('/top-regions/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const topRegions = await Image.aggregate([
//       { $match: { userId: mongoose.Types.ObjectId(userId) } }, // Adjust if userId is stored differently
//       {
//         $project: {
//           gridX: { $floor: { $divide: ["$longitude", 1] } }, // Grid width = 1 degree
//           gridY: { $floor: { $divide: ["$latitude", 1] } },  // Grid height = 1 degree
//         }
//       },
//       {
//         $group: {
//           _id: { gridX: "$gridX", gridY: "$gridY" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $sort: { count: -1 }
//       },
//       {
//         $limit: 3
//       },
//       {
//         $project: {
//           _id: 0,
//           region: {
//             $concat: [
//               { $toString: "$_id.gridX" }, "°E - ",
//               { $toString: "$_id.gridY" }, "°N"
//             ]
//           },
//           centerLongitude: { $add: [ { $multiply: ["$_id.gridX", 1] }, 0.5 ] },
//           centerLatitude: { $add: [ { $multiply: ["$_id.gridY", 1] }, 0.5 ] },
//           imageCount: "$count"
//         }
//       }
//     ]);

//     res.json({ topRegions });
//   } catch (error) {
//     console.error('Error fetching top regions:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// router.get('/map-view/:userId', async (req, res) => {
//   console.log('insde.....')
//   const { userId } = req.params;
//   console.log('userId////',userId)
//   // const cacheKey = generateCacheKey(userId);

//   // Validate userId
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ error: 'Invalid userId format.' });
//   }

//   try {
//     // Check if data is in cache
//     // const cachedData = await redisClient.get(cacheKey);
//     // if (cachedData) {
//     //   console.log(`Cache hit for userId: ${userId}`);
//     //   return res.json(JSON.parse(cachedData));
//     // }

//     console.log(`Cache miss for userId: ${userId}. Fetching from MongoDB.`);

//     // Fetch data from MongoDB
//     const images = await Image.find({ userId: mongoose.Types.ObjectId(userId) }, {
//       _id: 1,
//       filePath: 1,
//       uploadedAt: 1,
//       latitude: 1,
//       longitude: 1,
//       imageBase64: 1,
//     }).lean();

//     // Store data in Redis with TTL (e.g., 1 hour)
//     // await redisClient.setEx(cacheKey, 3600, JSON.stringify(images));

//     return res.json(images);
//   } catch (error) {
//     console.error(`Error fetching map data for userId ${userId}:`, error);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

module.exports = router;
