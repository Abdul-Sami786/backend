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
  relayState: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Define a schema and model for the relay state
const relayStateSchema = new mongoose.Schema({
  state: { type: String, default: 'OFF' },  // Relay state (ON or OFF)
  timestamp: { type: Date, default: Date.now }
});

const RelayState = mongoose.model('RelayState', relayStateSchema);

// POST route to receive data from the ESP32 (sensor data)
app.post('/sensor', async (req, res) => {
  const { distance, relayState } = req.body;  // Extract distance and relayState from the request body

  if (distance === undefined || relayState === undefined) {
    return res.status(400).json({ message: 'Distance and relayState are required' });
  }

  // Create a new document with the received distance and relayState data
  const newSensorData = new SensorData({ distance, relayState });

  try {
    // Save the data to MongoDB
    await newSensorData.save();
    console.log(`Saved distance: ${distance} cm, Relay State: ${relayState}`);

    // Respond with a success message
    res.status(200).json({ 
      message: 'Data received and saved successfully', 
      distance, 
      relayState 
    });
  } catch (error) {
    console.error('Error saving data to MongoDB', error);
    res.status(500).json({ message: 'Failed to save data to database' });
  }
});

// GET route to retrieve the latest inserted sensor data along with the relay state
app.get('/latest-sensor', async (req, res) => {
  try {
    // Find the latest sensor data (sorted by timestamp in descending order, limit to 1)
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });

    if (!latestData) {
      return res.status(404).json({ message: 'No sensor data found' });
    }

    // Fetch the current relay state (the latest relay state document)
    const relayStateDoc = await RelayState.findOne().sort({ timestamp: -1 });

    // Get the relay state (default to 'OFF' if no relay state is found)
    const relayState = relayStateDoc ? relayStateDoc.state : 'OFF';

    // Send the latest data along with the relay state as a response
    res.status(200).json({
      message: 'Latest sensor data retrieved successfully',
      data: latestData,
      relayState,  // Add relay state to the response
    });
  } catch (error) {
    console.error('Error retrieving data from MongoDB', error);
    res.status(500).json({ message: 'Failed to retrieve data from database' });
  }
});

// POST route to control the relay (turn on or off)
app.post('/control-relay', async (req, res) => {
  const { action } = req.body;  // Get the action (ON or OFF) from the request body

  if (action !== 'ON' && action !== 'OFF') {
    return res.status(400).json({ message: 'Invalid action. Use ON or OFF.' });
  }

  try {
    // Update or create a new relay state document with the given action
    const updatedRelayState = await RelayState.findOneAndUpdate(
      {},
      { state: action },
      { new: true, upsert: true }  // Create a new document if none exists
    );

    console.log(`Relay turned ${action}`);

    // Respond with the updated relay state
    res.status(200).json({
      message: `Relay turned ${action}`,
      relayState: updatedRelayState.state,
    });
  } catch (error) {
    console.error('Error updating relay state:', error);
    res.status(500).json({ message: 'Failed to update relay state' });
  }
});

// GET route to fetch the current relay status
app.get('/relay-status', async (req, res) => {
  try {
    // Fetch the current relay state (the latest relay state document)
    const relayStateDoc = await RelayState.findOne().sort({ timestamp: -1 });
    const relayState = relayStateDoc ? relayStateDoc.state : 'OFF';  // Default to 'OFF' if no state found

    res.status(200).json({ relayState });
  } catch (error) {
    console.error('Error fetching relay state:', error);
    res.status(500).json({ message: 'Failed to retrieve relay state' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
