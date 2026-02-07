# 🚀 Smart Scheduling & Dynamic Resource Management System

![Project Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20MySQL-blue?style=for-the-badge)
![AI Model](https://img.shields.io/badge/AI-Genetic%20Algorithm-green?style=for-the-badge)

---

## 📖 Overview

This project is a **Machine Learning–based Smart Scheduling System** designed to automate and optimize the allocation of university resources.

Currently, university scheduling is a manual, error-prone process leading to double bookings and inefficient resource usage. Our solution utilizes **Genetic Algorithms (GA)** to automatically generate conflict-free timetables and **Machine Learning** to predict resource demand.

### 🎯 Key Objectives

- **Automate Scheduling:** Generate conflict-free timetables using AI  
- **Resource Optimization:** Maximize usage of lecture halls, labs, and vehicles  
- **Conflict Resolution:** Real-time detection with AI-driven rescheduling suggestions  
- **Centralized Management:** Unified platform for Academic, Event, and Transport management  

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---------|------------|-------------|
| **Frontend** | React.js (Vite) | Interactive UI for Admins, Lecturers & Students |
| **Backend** | Python (FastAPI) | High-performance API handling business logic |
| **Database** | MySQL | Stores users, resources, and schedules |
| **AI Engine** | Python (DEAP / Scikit-Learn) | Genetic Algorithms & ML demand forecasting |
| **Version Control** | Git & GitHub | Source code management |

---

## ⚡ Key Features

### 🏛️ Super Admin

- **Dashboard:** Real-time analytics of resource utilization  
- **Master Data:** Manage faculties, degrees, batches, and modules  
- **Infrastructure:** Add/Edit lecture halls and laboratories  
- **User Management:** Manage lecturers, students, and staff roles  

### 🧠 Academic Scheduler (AI Core)

- **Auto-Generation:** One-click timetable generation using Genetic Algorithms  
- **Constraint Management:** Define hard & soft scheduling rules  
- **Conflict Handling:** Visual conflict detection with AI-suggested alternatives  

### 👨‍🏫 Lecturer Portal

- **Availability:** Set preferred times and unavailable slots  
- **Reschedule Requests:** Request slot changes with real-time availability checks  

### 🚌 Resource Manager

- **Vehicle Management:** Manage fleet and assign drivers  
- **Event Booking:** Manage auditorium and ground reservations

### 🎓 Student Portal

- **Personal Timetable:** View individual class schedules by semester and batch
- **Real-Time Updates:** Instantly see timetable changes or rescheduled sessions
- **Event Awareness:** View academic and university event schedules
- **Event Booking:** Manage auditorium and ground reservations

---

## 📂 Project Structure

```bash
University-Scheduler/
│
├── backend/                # FastAPI Backend
│   ├── app/
│   │   ├── database/       # Database connection & session
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── utils/          # Helper functions
│   ├── alembic/            # Database migrations
│   ├── venv/               # Virtual environment
│   ├── main.py             # FastAPI entry point
│   ├── .env                # Environment variables
│   ├── requirements.txt    # Python dependencies
│   ├── DATABASE_SETUP.md   # Database documentation
│   └── ROADMAP.md          # Development roadmap
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API integration
│   │   ├── context/        # React context
│   │   └── assets/         # Images, styles
│   ├── public/
│   └── package.json
│
└── README.md               # Project documentation

```

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### 1️⃣ Prerequisites

Make sure you have the following installed:

* [Python 3.10+](https://www.python.org/)
* [Node.js (LTS)](https://nodejs.org/)
* [MySQL Server](https://www.apachefriends.org/) (via XAMPP or WAMP)

### 2️⃣ Database Setup

1. Open **phpMyAdmin** or **MySQL Workbench**.
2. Create a new database named `university_scheduler`.
3. Import the SQL script located in `database/schema.sql` (or run the provided SQL query).

### 3️⃣ Backend Setup (FastAPI)

Navigate to the backend folder:

```bash
cd backend

```

Create a virtual environment and activate it:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate

```

Install dependencies:

```bash
pip install fastapi uvicorn mysql-connector-python

```

Run the server:

```bash
uvicorn main:app --reload

```

> The API will run at: `http://127.0.0.1:8000`

### 4️⃣ Frontend Setup (React)

Open a new terminal and navigate to the frontend folder:

```bash
cd frontend

```

Install dependencies:

```bash
npm install

```

Run the development server:

```bash
npm run dev

```

> The App will run at: `http://localhost:5173`

---

## 📸 Screenshots

---

## 👥 Team Members - Group 14

* **W.N.M Chathuranga** (UWU/ICT/21/010) - *Lead Developer / Backend*
* **P.G.U.Dilshan** (UWU/ICT/21/013)
* **S.W.H Madushan** (UWU/ICT/21/032)
* **S.A. Wellalage** (UWU/ICT/21/042)
* **S.D.N.Silva** (UWU/ICT/21/077)

---

## 📄 License

This project is developed for the **Capstone Project (ICT 481-6)** at Uva Wellassa University.

```

***

### 💡 How to add this to your project:

1.  In **VS Code**, create a new file in your main folder (`University-Scheduler`) called `README.md`.
2.  Paste the code above into that file.
3.  Save it.
4.  When you push this to **GitHub**, it will automatically look like a beautiful webpage on your repository home page.

```
