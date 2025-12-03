# 🚗 AI Car Damage Detection & Insurance Claim Platform

A full-stack web application that uses **AI-powered instance segmentation** to detect vehicle damage, estimate repair cost, and support a complete online **insurance claim workflow**.  
Users can upload photos of their car, let the AI analyze damaged parts, submit a claim, and download a detailed PDF report — all inside one unified platform.

This project was developed for academic, portfolio, and real-world usage under modern web technologies (Next.js 14, FastAPI, PostgreSQL/Neon, and Cloudinary).

---

## 🧭 Table of Contents
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [API Overview](#-api-overview)
- [Workflows](#-workflows)
- [Future Improvements](#-future-improvements)
- [Thai Summary](#-thai-summary)
- [Author](#-author)

---

## 🚀 Features

### 🔍 **1. AI Car Damage Detection**
- Upload images of the car (single or multiple angles)
- Detect damaged parts via instance segmentation
- Supports merging duplicate detections across multiple images  
  → *Prevents double-charging the same bumper detected in multiple images*
- Displays affected car parts & severity levels

---

### 💰 **2. Repair Cost Estimation**
- Each detected car part is mapped to predefined repair cost range
- Total repair estimate auto-calculated
- Cost breakdown per part (e.g., bumper, door, fender)

---

### 📝 **3. Insurance Policy Verification**
- User submits policy information for validation
- System checks matching records from the insurance database
- Only verified users can file claims
- Claim status includes: `pending`, `approved`, `rejected`

---

### 📄 **4. PDF Claim Report**
- Auto-generated report containing:
  - Personal info
  - Policy details
  - AI damage detection results
  - Total cost estimation
  - Claim status
- PDF ready for download and submission to insurers

---

### 🛠 **5. Admin Dashboard**
Admin features include:
- Manage claims (approve / reject)
- View damage analytics
- Inspect AI outputs, photos, cost calculations
- Monitor user activity

---

### 🔐 **6. Authentication + Roles**
- NextAuth secure login
- JWT-based session
- Roles: `user`, `admin`
- Protected API routes and admin-only UI

---

### 🔔 **7. Real-Time Notifications**
- Claim approval notification
- Rejection with reason
- Badge count for unread messages
- Stored in MongoDB/DB for tracking

---

### 📊 **8. Analytics & Visualizations**
Built using **Recharts**:
- Most commonly damaged parts
- Claim trends over time
- Average repair cost

---

### ☁️ **9. Cloud Integration**
- Cloudinary for image uploads
- HuggingFace Spaces / FastAPI backend for AI inference
- Neon PostgreSQL for scalable production database

---

## 🏗 System Architecture

[ Next.js 14 Frontend + Backend API Routes ]
│
▼
[ PostgreSQL / Neon Database ]
│
▼
[ AI Service - FastAPI ]
│
▼
[ Cloudinary Storage (Images) ]

markdown
คัดลอกโค้ด

- Frontend + backend API: **Next.js 14 App Router**
- AI model in separate service (FastAPI / HuggingFace Space)
- Persistent DB on **PostgreSQL (Neon)**
- Images stored on **Cloudinary**

---

## 🧰 Tech Stack

### **Frontend**
- Next.js 14 (App Router)
- React + TypeScript
- TailwindCSS
- Shadcn UI
- Recharts

### **Backend**
- Next.js API Routes
- NextAuth (Credentials Provider)
- JWT authentication
- PostgreSQL (Neon)
- Prisma / pg driver (depending on setup)

### **AI Model**
- Python 3.10+
- FastAPI
- YOLO / Mask R-CNN (Instance Segmentation)
- Pillow / OpenCV

### **Cloud**
- Cloudinary (Image Upload)
- HuggingFace Space (AI Inference)
- Render / Vercel backend hosting

---

## 🔐 Environment Variables

Create `.env.local` (development):


# JWT
JWT_SECRET="<long_random_string>"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD=dggip608e
NEXT_PUBLIC_CLOUDINARY_PRESET=unsigned_accident

# AI Backend
NEXT_PUBLIC_DETECT_API_URL=https://ratchakrit2007-car-damage-api.hf.space

# Backend URL Prefix
NEXT_PUBLIC_URL_PREFIX=https://cdd-backend-deyv.onrender.com


🛠 Getting Started
1. Clone repository
bash
คัดลอกโค้ด
git clone https://github.com/Ratchakrit20/car-insurance-ai-platform.git
cd car-insurance-ai-platform
2. Install dependencies
bash
คัดลอกโค้ด
npm install
3. Run development server
bash
คัดลอกโค้ด
npm run dev
App runs at:

arduino
คัดลอกโค้ด
http://localhost:3000
4. Run AI service (optional, if local)
bash
คัดลอกโค้ด
cd ai-service
uvicorn main:app --reload --port 8000