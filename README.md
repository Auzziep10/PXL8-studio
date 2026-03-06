# PXL8 DTF Platform

Professional Direct-to-Film (DTF) Gang Sheet Builder and Fulfillment platform built with Next.js, Firebase, and Genkit AI.

## Getting Started Locally

To download your code from Firebase Studio, use the **Export** or **Download ZIP** button in the project toolbar. Once you have the files on your machine:

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory. You can find your Firebase configuration values in `src/firebase/config.ts` or in your Firebase Console.

```env
# Required for Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Required for Genkit AI (Server Side)
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

### 3. Run the Development Server
```bash
npm run dev
```
Access the app at `http://localhost:9002`.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (ShadCN).
- `src/ai`: Genkit AI flows and configuration.
- `src/firebase`: Firebase SDK initialization and custom hooks.
- `src/hooks`: Custom React hooks for cart and state management.
- `src/lib`: Utility functions and shared types.

## Deployment

This app is designed to be deployed on **Firebase App Hosting**. Configuration is pre-set in `apphosting.yaml`.