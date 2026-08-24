# College Features for GEHU Only (ClassFinder AI Agent)

A next-generation, 3D Glassmorphic classroom vacant-finder web application built using **React, TypeScript, Tailwind CSS, and Vite**, integrated with a serverless AI agent proxy powered by **OpenRouter**.

## 🚀 Features
* **AI Chat Agent:** Ask queries in natural language (e.g., *"Is there any lab empty right now?"*, *"Show room 124 schedule tomorrow"*).
* **3D Glassmorphic UI:** High-fidelity neon dashboard with glassmorphism panels, interactive 3D scaling hover states, and smooth layouts.
* **Vacant Room Finder:** Query empty rooms by date/time, filtered by Room Type (Classrooms, Lecture Theatres, or Labs).
* **Room Timelines:** Interactive visual blocks showing room schedules from 8:00 AM to 5:00 PM with detailed status tooltips.
* **Serverless Key Security:** Integrated via a backend proxy function to keep API keys hidden and secure from browser inspection.

## 🛠️ Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS, Lucide icons, Vite
* **Backend:** Vercel Serverless Functions (Node.js)
* **AI Engine:** OpenRouter APIs

## 📦 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Local Server:**
   ```bash
   npm run dev
   ```

3. **Configure Environment Variable:**
   Create an environment variable `OPENROUTER_API_KEY` on your hosting server (Vercel) to enable the AI Agent.
