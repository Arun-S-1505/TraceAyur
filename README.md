# TraceAyur - Ayurvedic Product Traceability System

A comprehensive traceability system for Ayurvedic products that enables tracking from farm to consumer using QR codes and blockchain-inspired technology.

## Project Structure

```
TraceAyur/
├── backend/          # Node.js API server
├── mobile/           # React Native mobile app
└── README.md
```

## Features

### Mobile App (React Native + Expo)
- **Collector Interface**: For farmers and collectors to log harvests
  - Input farmer details, crop type, and quantity
  - Automatic GPS location capture
  - Local storage with offline sync capability
  - Real-time data submission to backend

- **Consumer Interface**: For end consumers to verify products
  - QR code scanning functionality
  - Product provenance display
  - Supply chain transparency

### Backend (Node.js + Express)
- RESTful API for data management
- Collection event storage and retrieval
- QR code generation for products
- Data synchronization with mobile app

## Tech Stack

### Mobile App
- **Framework**: React Native with Expo SDK 49
- **Navigation**: React Navigation 6
- **State Management**: React Hooks
- **Storage**: AsyncStorage for offline capability
- **Location**: Expo Location API
- **Camera**: Expo Camera & Barcode Scanner
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript
- **Development**: Nodemon for hot reloading

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TraceAyur.git
   cd TraceAyur
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npm start
   ```
   The backend server will start on `http://localhost:3000`

3. **Setup Mobile App**
   ```bash
   cd mobile
   npm install
   expo start
   ```
   Scan the QR code with Expo Go app on your mobile device

## API Endpoints

### Collection Events
- `POST /api/collection-events` - Submit new collection event
- `GET /api/collection-events` - Retrieve all collection events
- `GET /api/collection-events/:id` - Get specific collection event

### Provenance
- `GET /api/provenance/:qrCode` - Get product provenance data

## Development

### Mobile App Development
```bash
cd mobile
npm start          # Start Expo development server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run web        # Run in web browser
```

### Backend Development
```bash
cd backend
npm start          # Start with nodemon (auto-reload)
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Ayurvedic industry to ensure product authenticity
- Inspired by blockchain and supply chain transparency principles
- Designed with farmers and consumers in mind

## Project Status

🚧 **Under Development** - This project is actively being developed.

### Current Features
- ✅ Mobile app with collector and consumer interfaces
- ✅ Backend API with collection event management
- ✅ QR code scanning functionality
- ✅ GPS location capture
- ✅ Offline storage and sync

### Planned Features
- 🔄 Blockchain integration for immutable records
- 🔄 Advanced analytics dashboard
- 🔄 Multi-language support
- 🔄 Enhanced security features
- 🔄 Batch management system