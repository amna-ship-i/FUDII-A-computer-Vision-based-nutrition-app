# Füdii: AI-Powered Wellness Application

## PRIVATE APPLICATION
**Important**: This application is private and not intended to be shared or accessed by unauthorized users. All data, code, and features are confidential and proprietary.

## Overview
Füdii is a comprehensive AI-powered wellness application that provides:
- 📷 Food tracking via image recognition
- 🤖 Customizable AI wellness/fitness coach
- 📊 Health data visualization and tracking
- 🔍 Barcode scanning for easy food logging
- 📱 Mobile-optimized interface for iPhone and Android
- 🔒 Secure user authentication

## Security Features
- Admin dashboard accessible only to authorized users
- Secure image upload with metadata stripping
- OAuth integrations for secure authentication
- Rate limiting to prevent abuse
- Encrypted database connections
- Environment variable segregation for secrets

## Data Privacy
- User data is handled securely and never exposed in client-side code
- Images are processed to remove metadata before storage
- Personal information is kept confidential
- Health integration data is handled according to best practices

## Configuration
The application requires various API keys and configuration values to function properly. See `.env.example` for required environment variables.

## Getting Started
For development:
```bash
npm install
npm run dev
```

For production:
```bash
npm run build
npm run start
```

## API Keys and Services
This application integrates with several third-party APIs:
- OpenAI for AI-powered features
- Edamam Food Database for nutritional information
- Google OAuth for authentication
- Stripe for payment processing
- Firebase for analytics (optional)

## License
This is a private application. All rights reserved.

---

© 2025 Füdii. Private and Confidential.