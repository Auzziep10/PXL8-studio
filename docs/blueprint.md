# **App Name**: PXL8 DTF Platform

## Core Features:

- Gang Sheet Builder: Interactive canvas for arranging artwork on a sheet with drag & drop, DPI scaling, and collision detection.
- AI Artwork Analysis: Uses Google Gemini API to assess artwork 'Printability Score,' 'Safety (NSFW check),' and provides textual feedback.
- Pre-built Upload: Alternative flow for professionals who built their sheet in Photoshop/Illustrator. Automatically detects image dimensions and suggests the most cost-effective sheet size based on the upload's aspect ratio.
- Shopping Cart & Checkout: Cart persistence via LocalStorage, mock shipping integration with EasyPost, and mock Stripe checkout flow.
- Image Processing with Header: Programmatically attaches a header to the composite gang sheet image with a QR code, Order ID, Customer Name, and Tracking ID using Canvas.
- Admin Fulfillment Dashboard: Live orders view, asset management, ZIP download for gang sheets, packing slip generation, and status updates.
- Order Tracking: Public-facing page to look up orders via Order ID or Tracking ID with a granular timeline of production steps.

## Style Guidelines:

- Background: Dark 'industrial' theme with zinc-950 (#18181B).
- Panel Backgrounds: zinc-800 (#262626) and zinc-900 (#18181b).
- Primary color: Neon Orange (#FF8A00) for calls to action and primary interactive elements, suggesting energy and action.
- Accent color: Neon Green (#00FF94) as a contrasting highlight color for status indicators and success messages.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern, machined, objective, neutral look.
- Use sharp, vectorized icons in white or Neon Orange for clarity against the dark background.
- Sticky top navbar with role-based links. 'Glassmorphism' (backdrop-blur, translucent borders) effect on panels.
- Subtle CSS animations, like floating blobs and fade-ins, to add visual interest without distracting from functionality.