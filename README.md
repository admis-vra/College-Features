<div align="center">

# 🏫 CampusOS — GEHU College Companion & AI Assistant
### *Intelligent Student Operating System for Graphic Era Hill University*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://college-features-for-gehu-only.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/admis-vra/College-Features)
[![React](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite%205-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

<br />

> **A next-generation, glassmorphic campus productivity suite built for Graphic Era Hill University (GEHU).**  
> ClassFinder AI, real-time vacant room discovery, OCR screenshot scanner, intelligent attendance lab, and automated academic calendar countdowns — all packed into one ultra-fast, mobile-first web app.

[🌐 Explore Live App](https://college-features-for-gehu-only.vercel.app) • [✨ Key Features](#-key-features) • [🛠️ Tech Stack](#-tech-stack) • [🚀 Quick Start](#-quick-start) • [📖 User Guide](#-how-to-use)

---

</div>

## 📌 Overview

Navigating university schedules, tracking mandatory 75% attendance limits, finding empty study rooms between lectures, and preparing for mid-term exams are everyday challenges for students.

**CampusOS (College Features for GEHU)** combines all these essentials into an intuitive, high-performance web dashboard:
- **Instant Classroom Vacancy Search**: Locate open classrooms, lecture theatres (LT), or computer labs for study sessions, club meetings, or project work.
- **Autonomous AI Campus Assistant**: Ask plain-English questions, receive dynamic UI widgets, or paste screenshots directly into chat.
- **Attendance Lab & Bunk Calculator**: Know exactly how many classes you can safely skip or must attend to preserve GEHU's 75% criteria.
- **Smart Multimodal OCR Vault**: Snap a photo or screenshot of your ERP attendance table or timetable printout, and let client-side OCR automatically parse it into your database.
- **Academic Countdown**: Real-time timer and schedule for upcoming Mid-Terms, End-Terms, Viva-Voce, and university holidays.

---

## ✨ Key Features

### 🤖 1. Autonomous AI Campus Assistant
* **Natural Language Reasoning**: Ask questions such as:
  * *"Is there any empty classroom on the 2nd floor right now?"*
  * *"Can I skip tomorrow's Operating Systems lecture?"*
  * *"Show me the schedule for CR-101 today."*
  * *"When is my next mid-term exam?"*
* **Hybrid Intelligence Engine**: Works completely in-browser with zero-latency deterministic schedule graph algorithms, backed by optional cloud LLMs (**Meta Llama 3.1 8B** via OpenRouter).
* **Interactive Chat Widgets**: Responses include rich visual cards, period progress bars, vacancy matrices, and attendance meters.
* **Clipboard & Image Upload Support**: Paste (`Ctrl + V` / `Cmd + V`) or upload an ERP screenshot directly inside the chat.

### 🔍 2. Vacant Room Finder & Filters
* **Real-time Querying**: Filter free rooms by date, start time, and end time.
* **1-Click Time Sync**: Instant *"Use Current Time"* button sets time to your local device clock.
* **Granular Room Categorization**:
  * **CR**: Classrooms (default focus for quick study spots)
  * **LT**: Lecture Theatres
  * **LAB**: Computer, Physics, and Engineering Laboratories
* **Complete University Timetable Coverage**: Backed by full GEHU course schedules mapped across all days (8:00 AM to 5:00 PM).

### 📈 3. Attendance Lab & "Safe-Bunk" Calculator
* **75% Mandatory Compliance**: Built-in logic tailored to university attendance guidelines.
* **Dynamic Scenarios**:
  * **Safe to Skip**: Calculates how many consecutive lectures you can miss while keeping attendance above 75%.
  * **Recovery Target**: Calculates how many consecutive classes you must attend to climb out of the warning/critical zone.
* **Health Indicators**: Color-coded badges (🟢 Safe ≥75%, 🟡 Warning 65-74%, 🔴 Critical <65%).
* **Manual or OCR-Imported**: Add subjects manually or extract them straight from ERP screenshots.

### 📷 4. Smart OCR Scanner & Document Vault
* **100% In-Browser OCR**: Powered by **Tesseract.js** — your documents never leave your machine unless cloud multimodal enhancement is requested.
* **Intelligent Document Classifier**:
  * **ERP Attendance**: Extracts subjects, attended lectures, total held, and attendance percentages.
  * **Timetable Printouts**: Parses lecture hours, rooms, and sections.
  * **Academic Calendars**: Extracts exam dates, semester breaks, and events.
* **Persistent Document Vault**: Saves scanned records in **IndexedDB** (`idb-keyval`) for high-capacity offline storage with live quota estimation.

### 📅 5. Academic Calendar & Exam Countdown
* **Live Countdown Badges**: Prominently displays days remaining until Mid-Term and End-Term examinations.
* **University Holiday Schedule**: Pre-loaded GEHU holidays and academic milestones.
* **Custom Milestone Support**: Add custom internal test dates and presentation deadlines.

### 🎨 6. 3D Glassmorphism & Mobile-First UX
* **Futuristic Aesthetics**: Dark-mode glassmorphic cards, luminous gradients, and smooth layout animations.
* **Responsive Dynamic Viewport (`100dvh`)**: Mobile bottom navigation bar and gesture slide-out drawer designed to eliminate keyboard-obscured inputs.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 5](https://vitejs.dev/) |
| **Styling & Design** | [Tailwind CSS 3](https://tailwindcss.com/) + Custom Glassmorphism Utilities |
| **Icons & UI Elements** | [Lucide React](https://lucide.dev/) |
| **OCR & Computer Vision** | [Tesseract.js](https://tesseract.projectnaptha.com/) (WebAssembly Client-Side OCR) |
| **Storage & Persistence** | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb-keyval](https://github.com/jakearchibald/idb-keyval) + LocalStorage Cache |
| **AI / LLM Integration** | [OpenRouter API](https://openrouter.ai/) (Meta Llama 3.1 8B Instruct) |
| **Backend & Serverless** | [Vercel Serverless Functions](https://vercel.com/docs/functions) (`/api/chat.ts`) |

---

## 📂 Project Architecture

```plaintext
College Feature/
├── api/
│   └── chat.ts                     # Vercel Serverless Function (OpenRouter proxy & secure key handling)
├── src/
│   ├── agent/
│   │   └── agentEngine.ts          # Core agentic reasoning, timetable graph queries & prompt builders
│   ├── components/
│   │   ├── AcademicCalendarView.tsx# Academic calendar, holiday timeline & exam countdowns
│   │   └── ScannerVaultView.tsx    # OCR scanner UI, document preview & IndexedDB storage vault
│   ├── data/
│   │   └── timetable.json          # University courses, rooms, slots & section mappings
│   ├── engines/
│   │   ├── academicCalendarEngine.ts# Exam schedules, holiday calculations & event management
│   │   ├── attendanceEngine.ts     # Attendance algorithms & safe-bunk calculation engine
│   │   └── ocrEngine.ts            # Tesseract.js pipeline & document heuristic parser
│   ├── storage/
│   │   └── db.ts                   # IndexedDB storage layer with memory cache & quota estimator
│   ├── utils/
│   │   └── timetableEngine.ts      # Vacancy calculation, room normalization & slot utilities
│   ├── App.tsx                     # Main dashboard layout, responsive navigation & tab controller
│   ├── index.css                   # Global styles & Tailwind CSS imports
│   └── main.tsx                    # React DOM entry point
├── all_courses_combined_timetable.csv# Raw master timetable data
├── package.json                    # Project metadata & dependencies
├── tailwind.config.js              # Custom Tailwind configuration
├── tsconfig.json                   # TypeScript compiler options
└── vite.config.ts                  # Vite build configuration
```

---

## 🚀 Quick Start

### Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (Version **18.x** or higher recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)
* [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/admis-vra/College-Features.git
cd College-Features-for-GEHU-only-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables *(Optional for Cloud AI)*
The in-browser local agent and timetable queries work out of the box with **zero configuration**.  
To enable the OpenRouter cloud multimodal/LLM proxy feature:

Create a `.env.local` file in the root directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```
> If deploying on **Vercel**, add `OPENROUTER_API_KEY` under **Project Settings → Environment Variables**.

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```plaintext
http://localhost:5173
```

### 5. Build for Production
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

---

## 📖 How to Use

### 1. Finding Empty Classrooms
1. Switch to the **Vacant Rooms** tab in the top navigation (or bottom bar on mobile).
2. Choose your **Date** or click **"Use Current Time"** for automatic synchronization.
3. Select your time range (e.g., `10:00 AM` to `11:00 AM`).
4. Filter by type: **Classrooms (CR)**, **Lecture Theatres (LT)**, or **Labs**.
5. Click **"Search Vacant Rooms"** to see all unoccupied spaces.

### 2. Inspecting Room Schedules
1. Go to the **Room Schedule** tab.
2. Select any room (e.g., `CR 101`, `LT 2`, `LAB 5`).
3. View the full 8:00 AM – 5:00 PM timeline showing free and occupied slots with course/subject details.

### 3. Calculating Attendance & Safe Bunks
1. Navigate to the **Attendance Lab** tab.
2. Add your subjects manually or scan an ERP screenshot.
3. Observe your live percentage and the calculated:
   * **Bunk allowance**: Number of classes you can miss while staying ≥ 75%.
   * **Recovery count**: Consecutive lectures needed if below 75%.

### 4. Scanning ERP Attendance & Documents
1. Navigate to **Smart OCR Scanner**.
2. Drag and drop or upload an ERP attendance screenshot, timetable, or exam datesheet.
3. The engine will run OCR, identify your subjects, and allow 1-click import into your Attendance Lab.
4. Saved scans can be viewed anytime in the **IndexedDB Document Vault**.

### 5. Interacting with the AI Assistant
1. Go to the **AI Assistant** tab.
2. Type queries like *"Are there free labs right now?"* or *"How many classes can I miss in Data Structures?"*.
3. Click the attachment icon or press `Ctrl + V` to paste an image for multimodal analysis.

---

## 🌐 Deployment

### Deploying to Vercel (Recommended)

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your `College-Features` repository.
4. Add the environment variable:
   * `OPENROUTER_API_KEY` = `your_openrouter_api_key` *(optional, for cloud AI)*
5. Click **Deploy**. Vercel will build the React Vite app and configure the `/api/chat.ts` serverless route.

---

## 🤝 Contributing

Contributions are welcome! If you want to add new GEHU departments, improve timetable accuracy, or enhance AI capabilities:

1. **Fork** the repository.
2. Create a new feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add AmazingFeature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a **Pull Request**.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ for Graphic Era Hill University (GEHU) students</sub>
</div>
