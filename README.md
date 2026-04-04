# Collaborative Calendar

**Live Deployment:** http://146.190.188.75

**Video Demo:** https://drive.google.com/file/d/1PqKE-YgKWEDCCuG3sXHx81muRoWNQFYi/view?usp=sharing
## Team Information
### Team 31
- **Peifeng Tian** — Student Number: 1001159257 — Email: edwardpc.tian@mail.utoronto.ca
- **Deruiyang Yang** — Student Number: 1006664655 — Email: derui.yang@mail.utoronto.ca
- **Leyang Zhang** — Student Number: 1006032598 — Email: leyang.zhang@mail.utoronto.ca
- **Sanzhe Feng** — Student Number: 1006664003 — Email: sanzgari.feng@mail.utoronto.ca


## Motivation

We chose this project because collaborative scheduling is a practical and realistic problem for student groups, yet many existing calendar tools are too feature-heavy. We wanted to build a lightweight collaborative calendar platform that focuses on essential shared event management while also making the cloud deployment architecture explicit and understandable.

This project was also a strong fit for the course objectives. It provided a concrete use case for containerization, Kubernetes orchestration, persistent relational storage, and cloud deployment in a managed environment.

## Objectives

The main objective of this project was to design and implement a cloud-native collaborative calendar platform that supports authenticated multi-user event management with persistent storage and cloud deployment.

From the application perspective, the system was intended to support shared calendars, protected event operations, and collaborative scheduling among multiple users. From the infrastructure perspective, the project aimed to demonstrate a complete deployment workflow using containerized services, Kubernetes orchestration, and persistent database storage in the cloud.

More specifically, our team aimed to achieve the following goals:

1. Build a containerized backend service for a collaborative calendar application.
2. Use Kubernetes as the orchestration platform for service management and deployment.
3. Use PostgreSQL as the persistent relational database for structured user and event data.
4. Deploy the system to DigitalOcean Kubernetes rather than limiting the project to local development.
5. Ensure that the database state persists across redeployments and pod restarts.

## Technical Stack

### Application Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL 17
- **Cache / Statistics:** Redis
- **Authentication:** JWT, bcrypt
- **Real-time Communication:** Socket.IO
- **Email Support:** Nodemailer with SMTP sandbox

### Infrastructure Stack

- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **Cloud Provider:** DigitalOcean Kubernetes
- **Persistent Storage:** PersistentVolume for PostgreSQL
- **Configuration Management:** Kubernetes Secrets
- **Database Initialization:** ConfigMap-based SQL initialization
- **Deployment Automation:** deploy.bat

## Features

### Containerization & Local Development
- Application fully containerized using **Docker** (Node.js backend, PostgreSQL, Redis)
- Multi-container setup managed with **Docker Compose** for local development
- Ensures consistent environments across development and deployment

### State Management & Persistence
- Uses **PostgreSQL** for relational data storage (users, calendars, events, permissions)
- Implements persistent storage using **Kubernetes PersistentVolumeClaims (PVCs)** to ensure data survives restarts
- Database schema enforces relationships and data integrity (foreign keys, constraints)

### Deployment (DigitalOcean - IaaS)
- Deployed on **DigitalOcean Kubernetes (DOKS)**
- Uses container images hosted in a registry and deployed to cloud infrastructure
- Supports production-ready environment with external services (DB, Redis)

### Orchestration (Kubernetes)
- Kubernetes used for full system orchestration:
  - **Deployments** for API, database, and Redis services
  - **Services** for internal networking and communication
  - **PersistentVolumeClaims** for database storage
- API configured with **multiple replicas** for high availability
- Readiness and liveness probes ensure system reliability

### Monitoring & Observability
- Integrated with **DigitalOcean monitoring tools**
- Tracks system metrics such as CPU, memory, and container health
- Logs available through Kubernetes for debugging and system visibility

## Advanced Features

### Real-Time Collaboration (WebSockets)
- Implemented using **Socket.IO**
- Users receive live updates when events are created, updated, or deleted
- Supports **multi-replica architecture** using **Redis Pub/Sub adapter**
- Ensures synchronization across distributed backend instances

### Security & Access Control
- Authentication implemented using **JWT (JSON Web Tokens)**
- Passwords securely hashed with **bcrypt**
- Role-based authorization:
  - Owner, Editor, Viewer permissions per calendar
- Secure API endpoints and protected WebSocket connections

### External Service Integration (Email Notifications)
- Integrated with **SMTP (Mailtrap)** for email notifications
- Automatically sends notifications for:
  - calendar sharing
  - event creation and updates
- Demonstrates integration with external communication services

### Backup & Recovery
- Automated database backups using **Kubernetes CronJob**
- Backups uploaded to **DigitalOcean Spaces (S3-compatible storage)**
- Enables recovery and protects against data loss

### High Availability & Scalability
- API deployed with **multiple replicas** in Kubernetes
- Redis-based messaging ensures consistency across instances
- System designed to scale horizontally with increasing load

## User Guide

This section provides step-by-step instructions for using the main features of the Collaborative Calendar application.

---

### 1. Register an Account

1. Navigate to the Register page (`/register.html`)
2. Enter:
   - Name  
   - Email  
   - Password  
   - Confirm Password  
3. Click **Register**

After successful registration, you can log in using your credentials.

---

### 2. Login

1. Go to the Login page (`/login.html`)
2. Enter your email and password  
3. Click **Login**

After logging in, you will be redirected to your homepage.

---

### 3. Homepage (Dashboard)

On the homepage, you can:

- View your user information  
- Upload or reset your profile picture  
- View your calendars  
- Navigate to a selected calendar  



---

### 4. Access a Calendar

1. Select a calendar from the homepage  
2. You will be redirected to the calendar page  

Here, you can view and manage events within that calendar.


---

### 5. Create an Event

1. Fill in the event details:
   - Title  
   - Location  
   - Start time  
   - End time  
   - Description (optional)  
2. Click **Create Event**

The event will appear in the event list.


---

### 6. Edit an Event

1. Click **Edit** on an existing event  
2. Modify the fields  
3. Click **Save Changes**


---

### 7. Delete an Event

1. Click **Delete** on an event  
2. Confirm deletion if prompted  

The event will be removed from the calendar.



---

### 8. Search and Filter Events

- Use the **search bar** to filter events by title  
- Use the **date selector** to filter events by date  
- Click **Clear Filters** to reset  



---

### 9. Share a Calendar

1. Enter the email of the user you want to share with  
2. Select a permission level:
   - **viewer** → read-only access  
   - **editor** → can modify events  
3. Click **Share Calendar**


---

###  10. Logout

- Click the **Logout** button on any page  
- Your session will be cleared and you will be redirected to login  

---



## Cloud Deployment Guide

The final version of the project is deployed on DigitalOcean Kubernetes.

Deployment is automated through the provided deployment script, deploy.bat.

Running this script applies the required Kubernetes resources and deploys the application to the cloud environment.

## Deployment Information

The live deployment URL of the application is:

http://146.190.188.75

## AI Assistance & Verification (Summary)

AI was used as a supporting tool rather than as a substitute for implementation or technical judgment.

One use of AI was in presentation preparation. In particular, some presentation visuals were AI-generated.

AI was also used selectively during deployment and infrastructure debugging. Its main contributions were in helping identify ways to debug Kubernetes pods, determine how to enter PostgreSQL and inspect the database directly when resolving SQL-related bugs, and troubleshoot connectivity issues between the API and the database. In one case, AI-assisted troubleshooting helped identify that some YAML configuration references did not match correctly during deployment, which caused the API and database services to fail to connect.

Correctness was verified through technical means rather than by relying on AI output alone. Verification included checking pod status, inspecting logs, entering PostgreSQL to inspect database state directly, and confirming that the corrected YAML references matched the deployed resources and restored API-database communication.

AI used as a limited support tool for backend feature development. It works to help review implementation ideas, explain how Socket.IO behavior changes in a multi-replica deployment, and suggest how a Redis-based adapter could be used to preserve real-time synchronization across multiple API instances. Verification was also done with help from AI by reviewing the backend code, helping testing the application behavior locally, confirming that authenticated users only had the intended permissions, and checking that event creation, update, and deletion triggered the expected real-time behavior in the running system.

AI was also used selectively during frontend development and debugging. Its main contributions were in helping reason about client-side state management, particularly in identifying potential issues with session handling using browser storage. For example, AI provided guidance on how sessionStorage behaves across page refreshes and highlighted common pitfalls related to stale or incorrectly shared state. This was useful in confirming our understanding when debugging a shared session state issue, where user data could be overwritten after a refresh. AI also assisted in reviewing frontend-backend integration logic, such as ensuring that authentication tokens were consistently included in API requests and that UI updates correctly reflected backend responses.


**To be completed**

## Individual Contributions

### Peifeng Tian

Peifeng Tian was primarily responsible for the infrastructure and deployment side of the project. This included the overall infrastructure setup, the cloud deployment workflow, and PostgreSQL persistent storage configuration.

Specific contributions included:

- setting up the infrastructure required for containerized deployment
- managing deployment configuration for the application and supporting services
- deploying the final system to DigitalOcean Kubernetes
- configuring and maintaining PostgreSQL persistent storage
- supporting deployment reproducibility through the deploy.bat workflow
- debugging infrastructure and deployment issues, including pod-level troubleshooting
- identifying and fixing configuration mismatches in YAML files that caused API and database connectivity failures

### Derui Yang

Derui Yang is responsible for the backend application features of the project. This included implementing secure user authentication, enforcing role-based permissions, supporting real-time collaboration, and adding notification-related backend functionality.

Specific contributions included:

- implementing user registration and login with JWT-based authentication and bcrypt password hashing
- protecting backend routes so only authenticated users can access application data
- designing and implementing calendar-based role permissions for owner, editor, and viewer access
- implementing backend logic for calendar sharing, member permission updates, and access-controlled event operations
- building the real-time update mechanism using Socket.IO so users can see event changes without manually refreshing
- extending the real-time architecture to work with multiple API replicas through Redis-backed cross-instance message broadcasting
- adding email notification functionality for calendar sharing and event creation and update actions
- debugging backend integration issues involving authentication, permissions, socket communication, and multi-user collaboration behavior

### Leyang Zhang

Leyang Zhang was primarily responsible for the backend data modeling and database-level integrity design of the project. This included designing the relational schema, enforcing structured data constraints, and implementing query-level data filtering mechanisms.

Specific contributions included:

- designing the relational database schema for users, calendars, events, and participant relationships
- implementing foreign key relationships to ensure referential integrity across core entities
- modeling many-to-many relationships for event participants through a dedicated junction table
- defining CHECK and UNIQUE constraints to prevent invalid state transitions and duplicate assignments
- implementing keyword-based event search using multi-table SQL joins
- designing and implementing query-level access filtering to ensure that users can only retrieve data they are authorized to access
- enforcing consistency and data correctness at the database layer rather than relying solely on application-level validation
- debugging SQL-related issues by directly inspecting PostgreSQL data and validating query behavior

### Sanzhe Feng

Sanzhe Feng was primarily responsible for the frontend development of the project. This included the design and implementation of all user-facing interfaces and integration with backend services.

Specific contributions included:

- designing and implementing all frontend pages, including login, registration, homepage, and calendar interfaces
- managing client-side session state using browser storage
- integrating real-time updates with updating the UI dynamically
- identifying and fixing a shared session state issue to ensure user session data remains isolated and cannot be overwritten during page refresh
- debugging frontend issues and resolving integration problems between frontend and backend services

## Lessons Learned and Concluding Remarks

Throughout this project, we gained experience in designing and deploying a cloud-native, distributed application. We have developed a strong understanding of **state management in containerized environments**. Using PostgreSQL with Kubernetes PersistentVolumeClaims highlighted the importance of maintaining persistent storage to ensure data durability across restarts and deployments. Additionally, working with Kubernetes provided hands-on experience with core concepts such as Deployments, Services, and scaling, reinforcing how orchestration improves system reliability and availability. 

Implementing **JWT-based authentication, password hashing, and secrets management** helped us follow best practices for protecting user data and securing APIs. We also learned how to debug and monitor a distributed system using logs and cloud provider tools, which is essential when working with multiple interconnected services. We also learned that real-time communication using WebSockets does not naturally scale and requires a shared messaging layer, such as Redis Pub/Sub, to synchronize events across instances.

Overall, this project demonstrates a fully containerized, cloud-native collaborative calendar system that integrates authentication, role-based access control, real-time updates, and cloud deployment. It successfully meets the course requirements while providing valuable experience in backend development, distributed system design, and modern DevOps practices. The system is scalable and extensible, with opportunities for future improvements such as enhanced user interfaces, auto-scaling, and additional analytics features.
