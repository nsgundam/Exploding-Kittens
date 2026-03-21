# 🐱 Exploding Kittens – Frontend  

---

## 📌 ภาพรวมโปรเจค (Project Overview)

โปรเจคนี้เป็นส่วน **Frontend** ของเกม **Exploding Kittens** แบบ Web Application  
พัฒนาโดยใช้ **Next.js (App Router + TypeScript)**

หน้าที่ของ Frontend คือการพัฒนา **User Interface (UI)** และเตรียมโครงสร้างสำหรับเชื่อมต่อ **Backend** 

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- ⚛️ **Next.js**
- ⚡ **React**
- 🟦 **TypeScript**
- 🎨 **PostCSS**
- 🔍 **ESLint**

---

## 📂 โครงสร้างโปรเจค (Project Structure)

> โปรเจค Next.js อยู่ภายในโฟลเดอร์ `frontend`

```txt
EXPLODING-KITTENS/
└── frontend/
    ├── app/                # หน้าเว็บ (App Router)
    ├── public/             # ไฟล์ static เช่น รูปภาพ
    ├── .next/              # ไฟล์ build (สร้างอัตโนมัติ)
    ├── node_modules/       # dependencies
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    └── README.md
```

---

## 🚀 วิธีการรันโปรเจค (Getting Started)

> ⚠️ โปรเจค Next.js อยู่ภายในโฟลเดอร์ `frontend`

### 1️⃣ Clone Repository

```bash
git clone https://github.com/<your-username>/Exploding-Kittens.git
```

### 2️⃣ เข้าไปที่โฟลเดอร์ Frontend

```bash
cd Exploding-Kittens/frontend
```

### 3️⃣ ติดตั้ง Dependencies

```bash
npm install
```
### ติดตั้งแพ็กเกจ canvas-confetti 
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```
### 4️⃣ รัน Development Server

```bash
npm run dev
```

จากนั้นเปิดเบราว์เซอร์ที่:

```
http://localhost:3000
```

---

## 👨‍💻 หน้าที่ความรับผิดชอบ (Frontend Responsibilities)

Frontend Developer มีหน้าที่ดังนี้:

- 🎨 ออกแบบและพัฒนา User Interface (UI)
- 🧩 สร้างและจัดการ React Components
- 🗂 วางโครงสร้างหน้าเว็บ (Routing & Layout)
- 🔄 จัดการ State Management
- 🔗 เชื่อมต่อ API กับ Backend
- 🎮 พัฒนา Interface สำหรับการเล่นเกม
- 🧪 ทดสอบและแก้ไขปัญหา UI

---