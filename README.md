<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1K-GRX0DUmyiyagSn6CAHyGARt4IsO3y2

## Run Locally

**Prerequisites:**  Node.js and Vercel CLI (`npm install -g vercel`)

### For Frontend Only (No API):
1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   - Note: API routes will not work in this mode. The app will work offline using local storage only.

### For Full Functionality (Frontend + API):
1. Install dependencies:
   `npm install`
2. Install Vercel CLI if not already installed:
   `npm install -g vercel`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the app with Vercel dev server:
   `npm run dev:vercel`
   - This runs both the frontend and API routes locally
