# 🚀 Smart Scheduling & Dynamic Resource Management System

![Project Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20MySQL-blue?style=for-the-badge)
![AI Model](https://img.shields.io/badge/AI-Genetic%20Algorithm-green?style=for-the-badge)

> **Capstone Project – Group 14**  
> Faculty of Technological Studies, Uva Wellassa University

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

---

## 📂 Project Structure

```bash
University-Scheduler/
│
├── backend/                # FastAPI Backend
│   ├── main.py             # Entry point
│   ├── venv/               # Virtual environment
│   └── ...
│
├── frontend/               # React Frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── database/               # SQL Scripts
│   └── schema.sql          # Database creation script
│
└── README.md               # Project documentation
