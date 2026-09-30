# 🚀 Smart Scheduling & Dynamic Resource Management System

![Project Status](https://img.shields.io/badge/Status-Deployed-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20MySQL%20%7C%20Docker%20%7C%20AWS-blue?style=for-the-badge)
![AI Model](https://img.shields.io/badge/AI-Genetic%20Algorithm-green?style=for-the-badge)

---
Linkedin Post : https://lnkd.in/p/eJaAfhqv

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
| **Frontend** | React.js (Vite), TailwindCSS | Interactive UI for Admins, Lecturers & Students |
| **Backend** | Python (FastAPI) | High-performance API handling business logic |
| **Database** | MySQL (AWS RDS) | Hosted relational database managed via Alembic migrations |
| **Storage** | Cloudinary | Cloud storage for user profile images and resources |
| **AI Engine** | Python (DEAP / Scikit-Learn) | Genetic Algorithms & ML demand forecasting |
| **Version Control** | Git & GitHub | Source code management |
| **Deployment** | Docker, Nginx, AWS EC2 | Fully containerized architecture deployed on AWS |

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

---

## 📂 Project Structure

```bash
University-Scheduler/
│
├── backend/                # FastAPI Backend
│   ├── app/                # Application logic (routers, models, schemas)
│   ├── alembic/            # Database migrations
│   ├── main.py             # FastAPI entry point
│   ├── seed_data.py        # Database seeder script
│   ├── Dockerfile          # Backend containerization
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React Frontend
│   ├── src/                # UI components and pages
│   ├── nginx.conf          # Nginx reverse proxy configuration
│   ├── Dockerfile          # Frontend containerization
│   └── package.json        
│
├── docker-compose.yml      # Multi-container orchestration
└── README.md               # Project documentation
```

---

## 🚀 Getting Started (Local Development)

### 1️⃣ Prerequisites
- **Docker & Docker Compose** installed
- **Git**

### 2️⃣ Environment Setup
1. Clone the repository: `git clone <repo-url>`
2. Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:3306/<db_name>
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=4320
DEBUG=True
CLOUDINARY_URL=cloudinary://<key>:<secret>@<name>
FRONTEND_URL=http://localhost:5173,http://localhost
```

### 3️⃣ Run with Docker
Run the following command from the root directory:
```bash
docker compose up --build -d
```
- **Frontend:** accessible at `http://localhost`
- **Backend API Docs:** accessible at `http://localhost:8000/docs`

### 4️⃣ Initialize Database
To seed the database with the initial Admin user and dummy data:
```bash
docker exec -it uni-scheduler-backend bash
alembic upgrade head
python seed_data.py
exit
```

---

## ☁️ AWS EC2 Deployment

The system is designed for seamless deployment on an AWS EC2 instance:
1. SSH into your EC2 instance and install Docker.
2. Clone the repository and navigate to the project root.
3. Create a `.env` file in the root directory to pass the EC2 IP to the frontend:
   `VITE_API_URL=http://<YOUR_EC2_IP>`
4. Set up the `backend/.env` with your AWS RDS database credentials.
5. Add swap memory (2GB recommended) if using a `t3.micro` instance to prevent OOM errors during the Vite build.
6. Build and start the containers:
   `sudo docker compose up --build -d`
7. Ensure AWS Security Groups allow inbound traffic on **Port 80**.

*(Note: Nginx handles Reverse Proxying for `/api/` requests over Port 80, bypassing restrictive Wi-Fi firewalls.)*

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
