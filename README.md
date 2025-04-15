# LangoSpark - Language Learning Platform

LangoSpark is a comprehensive language learning platform that combines the power of AI with proven language acquisition methods to create an engaging and effective learning experience.

## Project Structure

The project consists of two main components:

- **Backend Server**: A Node.js/Express API with PostgreSQL database (via Prisma ORM)
- **Mobile App**: A React Native/Expo application for iOS and Android

## Features

- **User Authentication**: Secure login and registration system
- **Personalized Learning Plans**: Custom learning paths based on user goals
- **Progress Tracking**: Monitor your language learning journey
- **AI-Powered Lessons**: Dynamic content generation for various language levels
- **Pronunciation Feedback**: Get real-time feedback on your speaking skills
- **Conversation Practice**: Practice with AI conversation partners
- **Multiple Language Support**: Learn various languages at different proficiency levels

## Technologies

### Backend

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **API Documentation**: RESTful API endpoints
- **AI Integration**: Anthropic Claude API for conversation and feedback

### Mobile App

- **Framework**: React Native with Expo
- **Navigation**: Expo Router for file-based routing
- **State Management**: React Context API
- **UI Components**: Custom components with Expo libraries
- **Audio Support**: Speech recognition and text-to-speech

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL database
- Anthropic API key (for AI features)

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` with your database and API credentials

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Mobile App Setup

1. Navigate to the app directory:
   ```bash
   cd langospark
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Use the Expo Go app on your device or an emulator/simulator to run the application

## Development Workflow

- The backend server runs on `http://localhost:3000` by default
- API endpoints are available under `/api` routes
- The mobile app connects to the backend API for data and AI features

## Contact

For more information about this project, please contact the development team.

## License

This project is proprietary software. 