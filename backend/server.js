const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with database in production)
let collectionEvents = [];
let provenanceData = {};

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit collection event
app.post('/collection', (req, res) => {
  try {
    const { farmerName, cropType, quantity, location, timestamp } = req.body;
    
    if (!farmerName || !cropType || !quantity || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const eventId = uuidv4();
    const collectionEvent = {
      id: eventId,
      farmerName,
      cropType,
      quantity,
      location,
      timestamp: timestamp || new Date().toISOString(),
      qrCode: `TRACE_${eventId.substring(0, 8).toUpperCase()}`
    };

    collectionEvents.push(collectionEvent);
    
    // Create provenance record
    provenanceData[collectionEvent.qrCode] = {
      ...collectionEvent,
      history: [
        {
          stage: 'Collection',
          timestamp: collectionEvent.timestamp,
          location: collectionEvent.location,
          details: `Collected by ${farmerName}: ${quantity}kg of ${cropType}`
        }
      ]
    };

    res.json({ 
      success: true, 
      eventId,
      qrCode: collectionEvent.qrCode,
      message: 'Collection event recorded successfully' 
    });
  } catch (error) {
    console.error('Error creating collection event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get provenance by QR code
app.get('/provenance/:qrCode', (req, res) => {
  try {
    const { qrCode } = req.params;
    const provenance = provenanceData[qrCode];
    
    if (!provenance) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json(provenance);
  } catch (error) {
    console.error('Error fetching provenance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all collection events
app.get('/collections', (req, res) => {
  try {
    res.json(collectionEvents);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TraceAyur Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  POST /collection - Submit collection event`);
  console.log(`  GET /provenance/:qrCode - Get provenance data`);
  console.log(`  GET /collections - Get all collection events`);
});
