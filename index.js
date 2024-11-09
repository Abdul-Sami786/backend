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
  relayStatus: { type: String, required: true },  // Added relayStatus field
  timestamp: { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Relay state (For simulation, in a real-world case you'd control GPIO pins here)
let relayState = 'OFF';  // Default state is OFF

// POST route to receive data from the ESP32
app.post('/sensor', async (req, res) => {
  const { distance, relayStatus } = req.body;  // Extract distance and relayStatus from the request body

  if (distance === undefined || relayStatus === undefined) {
    return res.status(400).json({ message: 'Distance or relay status not provided' });
  }

  // Create a new document with the received distance and relayStatus data
  const newSensorData = new SensorData({ distance, relayStatus });

  try {
    // Save the data to MongoDB
    await newSensorData.save();
    console.log(`Saved distance: ${distance} cm, Relay Status: ${relayStatus}`);

    // Respond with a success message
    res.status(200).json({ message: 'Data received and saved successfully', distance, relayStatus });
  } catch (error) {
    console.error('Error saving data to MongoDB', error);
    res.status(500).json({ message: 'Failed to save data to database' });
  }
});

// GET route to retrieve the latest inserted sensor data
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

// POST route to control the relay (turn on or off)
app.post('/control-relay', (req, res) => {
  const { action } = req.body;  // Get the action (ON or OFF) from the request body

  if (action === 'ON') {
    relayState = 'ON';
    console.log("Relay turned ON");

    // Here, you would add code to actually control the relay hardware (GPIO pin)
    // Example: relayModule.turnOn() or something similar depending on your hardware

    // Save the relay status change to the database
    saveRelayStatus('ON');

    return res.status(200).json({ message: 'Relay turned ON', relayStatus: relayState });
  } 
  else if (action === 'OFF') {
    relayState = 'OFF';
    console.log("Relay turned OFF");

    // Here, you would add code to actually turn the relay off
    // Example: relayModule.turnOff()

    // Save the relay status change to the database
    saveRelayStatus('OFF');

    return res.status(200).json({ message: 'Relay turned OFF', relayStatus: relayState });
  } 
  else {
    return res.status(400).json({ message: 'Invalid action. Use ON or OFF.' });
  }
});

// Helper function to save relay status in the database
async function saveRelayStatus(status) {
  try {
    // Create a new sensor data document with relay status (you can leave distance as null or a dummy value)
    const relayData = new SensorData({
      distance: null,  // No distance value, but we are saving relay status change
      relayStatus: status,
    });
    await relayData.save();
    console.log(`Relay status updated to: ${status}`);
  } catch (error) {
    console.error('Error saving relay status', error);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
