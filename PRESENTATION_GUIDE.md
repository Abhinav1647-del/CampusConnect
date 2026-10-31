# CampusConnect — Pitch Deck & Presentation Guide
**Event:** Tantra Hackathon  
**Project:** IIIT Nagpur Campus Connect Platform  
**Format:** 10 Clean, High-Impact Slides for Judges  

An interactive, responsive presentation slide deck has been generated directly at:  
👉 **[presentation.html](file:///c:/Users/abhin/OneDrive/Desktop/CampusConnectTantra/presentation.html)** (Double-click or open in Chrome/Edge, supports arrow keys & **Save as PDF**).

---

## 📽️ Slide Breakdown & Judge Speaking Notes

### Slide 1: Title & Vision
- **Header:** Tantra Hackathon Presentation • IIIT Nagpur
- **Title:** **CampusConnect** — The Unified Digital Operating System for Campus Life
- **Subtitle:** Bringing Mess Management, Clubs & Events, and a Secure P2P Campus Marketplace into one cohesive, role-driven platform.
- **Key Badges:** Production Ready (NestJS + Prisma) • Cross-Platform (Web + Expo Mobile) • Role-Based RBAC
- **Speaking Note (Judges Pitch):**  
  > *"Good morning judges. As college students, our everyday campus experience is fragmented across dozens of unmoderated WhatsApp groups, forgotten Google Forms, and messy noticeboards. Today we present CampusConnect: a single unified platform engineered specifically for college ecosystems."*

---

### Slide 2: The Core Problem
- **Problem 1: Mess Disconnect 🍽️**
  - No real-time daily menu visibility. Feedback is lost in verbal complaints with zero actionable metrics for caterers.
- **Problem 2: Club & Event Chaos 📢**
  - Hackathons, workshops, and recruitment announcements get drowned in spam. Registrations lack automated capacity management.
- **Problem 3: Unsafe Campus Commerce 🛒**
  - Buying/selling textbooks, lab kits, or cycles relies on chaotic chat threads without student verification, reviews, or organized history.
- **Speaking Note:**  
  > *"Students lose hours navigating chaotic chats, while college administration and clubs struggle to engage and gather feedback."*

---

### Slide 3: The CampusConnect Solution
- **1. Smart Dining Hub 🍽️:** Real-time menus (Breakfast/Lunch/Snacks/Dinner), star ratings, sentiment feedback, and urgent circulars.
- **2. Clubs & Events Portal 🎪:** Verified club profiles, one-click event registrations, automated waitlists, and capacity limits.
- **3. CampusCart P2P Marketplace 🛍️:** Closed-loop peer marketplace with verified student emails, in-app messaging, status tracking, and moderator controls.
- **Speaking Note:**  
  > *"Instead of building three disconnected apps, CampusConnect unifies food, campus culture, and commerce under a single secure login."*

---

### Slide 4: Deep Dive into Campus Workflows
- **Mess & Food Quality Assurance:**  
  - *Students:* View published daily menus, rate food 1–5 stars with detailed notes.  
  - *Admins:* Schedule weekly menus and analyze historical student satisfaction curves.
- **Clubs & Events Lifecycle:**  
  - *Event Engine:* Automated capacity guards, deadlined registrations, and instant status updates.  
  - *Showcase:* Club leads post announcements directly to enrolled students.
- **CampusCart Peer Marketplace:**  
  - *Category sorting:* Books, Electronics, Cycles, Room essentials, Lab coats.  
  - *Trust layer:* Buyer inquiry threads, item statuses (Active, Reserved, Sold), and seller feedback.
- **Push Notification Engine:** Expo mobile push ready for event reminders and listing alerts.

---

### Slide 5: Role-Based Access Control (RBAC) & Governance
- **Student (`STUDENT`):** Register for events, review meals, list/buy items, chat with peers.
- **Club Lead (`CLUB_LEAD`):** Create and manage club events, monitor attendee rosters, post announcements.
- **Mess Admin (`MESS_ADMIN`):** Publish daily meal menus, post urgent notices, view meal rating analytics.
- **App Admin (`APP_ADMIN`):** Total system observability, user role management, audit logs, and listing moderation.
- **Speaking Note:**  
  > *"Security is built into our core. Every single backend endpoint is protected by NestJS Guards and strict JWT role validation."*

---

### Slide 6: Technical Architecture
- **Frontend:** React 19, TanStack Start & Router, Vite, Tailwind CSS, Radix UI primitives.
- **Backend:** NestJS 12 Modular Monolith, TypeScript, DTO validation (`class-validator`), Swagger OpenAPI documentation.
- **Persistence & ORM:** PostgreSQL database with Prisma ORM (40+ relational models with indexes and cascades).
- **Mobile Integration:** Expo / React Native mobile app client with push notification support.

---

### Slide 7: Why CampusConnect Wins (Key Differentiators)
- **1. Zero Friction:** No more 10+ disjointed group chats or endless Google Forms.
- **2. Data-Driven Accountability:** Measurable feedback on dining quality replaces endless student complaints with transparent ratings.
- **3. Closed-Loop Security:** Verified `@iiitn.ac.in` domain access ensures trust and eliminates outside spam.

---

### Slide 8: The Live Demo (Step-by-Step for Judges)
1. **Login & Dashboard:** Demonstrate instant role recognition and clean responsive navigation.
2. **Dining Feedback:** Check today's Lunch menu, submit a live rating, and show the historical trend.
3. **Club Event Registration:** Register for a workshop in 1 click and verify capacity tracking.
4. **CampusCart Interaction:** Open a listed textbook, initiate a buyer inquiry, and demonstrate the in-app chat flow.

---

### Slide 9: Scalability & Future Roadmap
- **Phase 1: Escrow & UPI QR:** In-app payment verification and safe handover confirmation.
- **Phase 2: Dynamic QR Ticketing:** Auto-generated QR entry passes for club events to prevent gate bottlenecks.
- **Phase 3: Multi-Tenant Architecture:** Expand from IIIT Nagpur to any campus nationwide with plug-and-play SSO.

---

### Slide 10: Conclusion & Q&A
- **Summary:** Enterprise-grade fullstack application solving real student friction.
- **Tech Highlights:** 49+ unit/integration tests, Swagger UI at `/api/docs`, Prisma relational integrity.
- **Closing Statement:** *"Thank you judges! We are ready for your questions."*
