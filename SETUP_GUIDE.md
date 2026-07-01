# Quick Signal - Setup & Deployment Guide

This guide will walk you through setting up and deploying the Real-Time Quick Signal app for free.

## 1. Configure Your Secret PINs

The app uses two PINs for access control:
- **Sender PIN**: The PIN you use to access the photo gallery and send messages.
- **Receiver PIN**: The PIN your boyfriend uses to access the dashboard and receive notifications.

By default, these are `1111` (Sender) and `2222` (Receiver). 

To change them:
1. Open the `.env` file (or create it from `.env.example`).
2. Set your custom PINs:
   ```env
   SENDER_PIN=1234
   RECEIVER_PIN=5678
   PORT=3000
   ```

## 2. Deploy to a Free Hosting Platform (Render or Vercel)

We recommend **Render.com** because this app uses WebSockets and background push notifications, which require a continuously running Node.js server.

### Deployment on Render.com
1. Create a free account on [Render](https://render.com/).
2. Push your code to a GitHub repository (do **NOT** include the `.env` file).
3. On the Render Dashboard, click **New +** and select **Web Service**.
4. Connect your GitHub account and select the repository.
5. Setup the deployment settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Scroll down to **Environment Variables**:
   - Add `SENDER_PIN` and set your secret sender PIN.
   - Add `RECEIVER_PIN` and set your secret receiver PIN.
7. Click **Create Web Service**. 
8. Render will deploy your app and give you a public, secure URL (e.g., `https://quick-signal-xyz.onrender.com`).

## 3. How to Use
1. Send the deployed URL to your boyfriend. Tell him to log in with the **Receiver PIN**.
2. **Crucial Step**: When he logs in, his browser will ask for Notification Permissions. He **must tap "Allow"**.
3. He can now close the browser tab.
4. You log in using the **Sender PIN**.
5. Tap a picture in the gallery. He will instantly receive a native push notification on his phone!
