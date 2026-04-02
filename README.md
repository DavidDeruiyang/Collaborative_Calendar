# Collaborative Calendar

**Live Deployment:** http://146.190.188.75

## Team Information
### Team 31
- **Peifeng Tian** — Student Number: 1001159257 — Email: edwardpc.tian@mail.utoronto.ca
- **[Member 1 Full Name]** — Student Number: [xxxxxxx] — Email: [email]
- **[Member 2 Full Name]** — Student Number: [xxxxxxx] — Email: [email]
- **[Member 3 Full Name]** — Student Number: [xxxxxxx] — Email: [email]


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

**To be added**

## User Guide

**To be added**

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

### [Member 2 Name]

**To be completed**

### [Member 3 Name]

**To be completed**

### [Member 4 Name]

**To be completed**

## Lessons Learned and Concluding Remarks

**To be completed**