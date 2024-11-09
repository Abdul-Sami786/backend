const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// MongoDB connection string (replace with your actual Atlas connection string)
const mongoURI = 'mongodb+srv://sami:sami@embedeed.2bigv.mongodb.net/sensorDB?retryWrites=true&w=majority&appName=Embedeed';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

// Define a schema and model for the sensor data
const sensorDataSchema = new mongoose.Schema({
  distance: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Define a POST route to receive data from the ESP32
app.post('/sensor', async (req, res) => {
  const { distance } = req.body;  // Extract distance data from the request body
  
  if (distance === undefined) {
    return res.status(400).json({ message: 'Distance not provided' });
  }

  // Create a new document with the received distance data
  const newSensorData = new SensorData({ distance });

  try {
    // Save the data to MongoDB
    await newSensorData.save();
    console.log(`Saved distance: ${distance} cm`);

    // Respond with a success message
    res.status(200).json({ message: 'Data received and saved successfully', distance });
  } catch (error) {
    console.error('Error saving data to MongoDB', error);
    res.status(500).json({ message: 'Failed to save data to database' });
  }
});

// Define a GET route to retrieve the latest inserted data
app.get('/latest-sensor', async (req, res) => {
  try {
    // Find the latest sensor data (sorted by timestamp in descending order, limit to 1)
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });

    if (!latestData) {
      return res.status(404).json({ message: 'No sensor data found' });
    }

    // Send the latest data as a response
    res.status(200).json({
      message: 'Latest sensor data retrieved successfully',
      data: latestData,
    });
  } catch (error) {
    console.error('Error retrieving data from MongoDB', error);
    res.status(500).json({ message: 'Failed to retrieve data from database' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
