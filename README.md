# Quick Signal

A fully discreet, real-time web application for sending secret messages without leaving any trace.

## Features
- **Zero Trace:** Messages are sent via WebSockets directly between devices. No database is used, meaning no chat history is ever saved.
- **Push Notifications:** Uses a background Service Worker to deliver native push notifications to the receiver, even if their browser tab is completely closed.
- **Offline Queuing:** If the receiver is offline, messages are temporarily held in RAM and delivered (with the correct timestamp) immediately upon their next login. They are then wiped from memory.
- **Discreet UI:** The sender uses a minimal "Photo Gallery" dashboard to send messages by tapping pictures, and the login page looks like a generic server monitor.
- **Dual-PIN System:** Simple authentication uses PIN codes (no usernames required).

## Setup Instructions
Please refer to the [SETUP_GUIDE.md](SETUP_GUIDE.md) for step-by-step instructions on deploying the app for free.