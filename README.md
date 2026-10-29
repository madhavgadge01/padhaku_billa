# LifeLevel — Production Gamified Productivity & Focus RPG Web Application

**LifeLevel** is a production-grade, full-stack gamified productivity web application built with **React.js (Vite + Tailwind CSS)** and a **Node.js / Express & MongoDB (Mongoose)** backend. It is designed to boost user focus, discipline, and habit consistency through Free Fire-style 3D vector RPG mechanics, Tamagotchi companion survival care, dual-streak architecture, and deep behavioral analytics.

---

## 🌟 Key Features & Architecture

### 1. Authentication & Onboarding System
- **MongoDB & Node.js/Express Backend**:
  - Secure `User` schema (`id`, `name`, `email`, `passwordHash`, `age`, `fieldOfStudy`, `restDay`, `coins`, `health`, `streaks`, `inventory`, `pet`).
  - JWT Session authentication and `bcrypt` password hashing.
- **Email OTP Verification Flow**:
  - Email verification with Nodemailer / Ethereal dispatch.
  - Development Auto-Fill helper button for instant testing.
- **3-Step Post-Signup Onboarding Questionnaire**:
  1. **Identity & Demographics**: Name, Age, Field of Study (e.g. *Computer Science, Medical, Software Engineer, Competitive Exams*).
  2. **Weekly Rest Day Configuration**: Optional weekly off-day (e.g. *Sunday*). When active:
     - Streaks are frozen (no penalty for 0 tasks).
     - Pet hunger & health decay rate is **0%**.
     - Daily tasks are optional with zero penalties.
  3. **Starter Character Selection**: Choose from 5 custom 3D-styled game avatars (*Cyber Cat, Samurai Deer, Bionic Bunny, Titan Bear, Kitsune Fox*). The legendary **"Suit & Boot Businessman"** is strictly locked behind a 365-day global streak achievement.

---

### 2. Task Manager & Dual-Streak Architecture
- **Custom Quests**: Create tasks with custom durations (minutes) and custom color tags (*Red for DSA, Green for English, Blue for Math, etc.*).
- **Dual-Level Streak Logic**:
  1. **Individual Task Streak**: Tracked per task based on daily completion.
  2. **Global Main Day Streak**: Increments **ONLY IF ALL DAILY TASKS** are 100% completed! If even 1 task is skipped (and it's not a Rest Day), the Global Main Streak resets to 0.

---

### 3. Pomodoro Timer Engine & Payout/Penalty Math
- **Controls**: Start, Pause, Resume, Stop with session timestamps stored in MongoDB.
- **Reward & Penalty Algorithm**:
  - **Base Reward**: Completing 1 task uninterrupted = **+5 Coins**.
  - **Pause Penalty**: Clicking "Pause" deducts **1 Coin** from payout (1 pause = 4 coins, 2 pauses = 3 coins, etc.).
  - **Zero Coin Threshold**: 5 or more pauses drops session payout to **0 Coins**.
  - **All-Tasks Daily Bonus**: Completing ALL daily scheduled tasks awards an extra **+5 Bonus Coins**.
- **Web Audio API**: Procedural sound effects for start, tick, pause penalty buzzer, coin clink, and victory fanfare.

---

### 4. Tamagotchi Pet Virtual Care & Survival System
- **Vitality & Hunger Meters**: Companion requires feeding (food = 2 coins, water = 1 coin) to stay alive.
- **Neglect Consequence**: Inactivity causes hunger to drop; starving pets lose health. If health hits 0, the pet faints, **locking all shop items** and resetting affection.
- **Revival Elixir**: Revive fainted pets with a 10-coin elixir.
- **Rest Day Shield**: Pet decay is **0%** on official Rest Days.

---

### 5. Interactive RPG Room Canvas & Cosmetics Emporium
- **3D-Styled RPG Room**: Renders the active avatar, equipped apparel, equipped real estate environment, and parked vehicle.
- **Zero Stock Images**: All assets rendered via custom vector SVG and CSS art.
- **Upgrades Catalog**:
  - **Apparel**: Basic Gear ➔ Cyber Casual ➔ Quantum High-Top Boots ➔ Luxury Suits & Watches.
  - **Vehicles**: Eco Bicycle ➔ Urban Hatchback ➔ Executive Sedan ➔ Apex Hypercar.
  - **Real Estate**: Cozy Room ➔ High-Rise Apartment ➔ Oceanfront Villa ➔ Luxury Mansion.
  - **Achievement Unlock**: 365-Day Global Streak unlocks the **"Suit & Boot Businessman"** avatar.

---

### 6. Behavioral Analytics & Peer Benchmarking Engine
- **Peer & Industry Benchmark**: Compares daily focus hours against global statistical distributions in the user's field of study, calculating exact percentile ranks and daily hours needed to reach the Top 10%.
- **Pause Pattern Detector**: Behavioral AI/logic identifying friction (e.g. *"You pause your sessions 40% more frequently on Mondays & Fridays compared to mid-week days"*).
- **Time Distribution Charts**: Color-coded charts by task tags.
- **Completion Calendar Heatmap**: GitHub-style activity grid.
- **1-Click 14-Day Demo Data Seeder**: Instantly populate realistic past sessions for evaluation.

---

## 🚀 Quickstart & Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running on `mongodb://127.0.0.1:27017/lifelevel`

### Start Backend Server
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:5001
```

### Start Frontend Client
```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:5173
```
