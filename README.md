# PXL8 DTF Platform

Professional Direct-to-Film (DTF) Gang Sheet Builder and Fulfillment platform built with Next.js, Firebase, and Genkit AI.

## Getting Started Locally

To move your development from Firebase Studio to your local machine:

### 1. Download the Source Code
In the **Firebase Studio** interface, click the **Export** or **Download ZIP** button located in the **top-right toolbar**. Extract the contents to a folder on your computer.

### 2. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the root directory. You can find your Firebase configuration values in `src/firebase/config.ts`.

```env
# Firebase Client Configuration (from src/firebase/config.ts)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Genkit / AI Configuration
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Access the app at `http://localhost:9002`.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: UI components and the Gang Sheet Builder logic.
- `src/ai`: Genkit AI flows for design generation and analysis.
- `src/firebase`: Firebase SDK setup and custom React hooks.
- `src/hooks`: Shared state management (Cart, etc.).
- `src/lib`: Types and utility functions.

## Deployment

This app is optimized for **Firebase App Hosting**. When you are ready to publish, you can connect your GitHub repository directly in the Firebase Console.
