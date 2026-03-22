# Collaborative Calendar (Kubernetes Edition)

A cloud-native collaborative calendar platform that supports shared
event management with persistent storage. The system supports authenticated users, role-based calendar sharing, protected event management, real-time collaboration, and email notifications. The system runs as a containerized **Node.js API** deployed on **Kubernetes using Minikube**, with **PostgreSQL 17** as the database and **Redis** for caching.

## Features

- User registration and login with JWT authentication
- Protected API routes using bearer tokens
- Calendar-based role-based access control
- Calendar sharing with three roles:
  - **Owner**: full control of calendar, events, and members
  - **Editor**: can view, create, update, and delete events
  - **Viewer**: read-only access
- Event CRUD with permission checks
- Calendar member management
- Redis-backed event count statistics
- Real-time updates with WebSockets
- Email notifications for:
  - calendar sharing
  - event creation
  - event updates
  - Event status tracking (scheduled, cancelled, completed)
  - Event participant assignment management
  - Search functionality for events by keyword or participant email

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Cache / Stats:** Redis
- **Authentication:** JWT, bcrypt
- **Real-time communication:** Socket.IO
- **Email notifications:** Nodemailer with SMTP sandbox
- **Containerization:** Docker
- **Orchestration:** Kubernetes (Minikube for local cluster testing)

## Architecture

- **calendar-api**: Express backend service
- **calendar-db**: PostgreSQL database
- **calendar-redis**: Redis cache for event statistics
- Kubernetes services expose the API and connect internal components.

## Role Permissions

### Owner
- Create, read, update, delete calendars
- Create, read, update, delete events
- Share calendar with other users
- Change member roles
- Remove members

### Editor
- Read calendars shared with them
- Create, read, update, delete events
- Cannot manage members

### Viewer
- Read calendars shared with them
- Read events only
- Cannot create, update, or delete events
- Cannot manage members

## API Endpoints

### Authentication
- `POST /auth/register`
- `POST /auth/login`
- `GET /me`

### Calendars
- `POST /calendars`
- `GET /calendars`
- `GET /calendars/:id`
- `PUT /calendars/:id`
- `DELETE /calendars/:id`

### Calendar Sharing / Members
- `POST /calendars/:id/share`
- `GET /calendars/:id/members`
- `PATCH /calendars/:id/members/:userId`
- `DELETE /calendars/:id/members/:userId`

### Events
- `POST /events`
- `GET /events`
- `GET /events/:id`
- `PUT /events/:id`
- `DELETE /events/:id`
- `GET /events/search?q=keyword`
- `POST /events/:id/participants`
- `DELETE /events/:id/participants/:userId`

### Stats
- `GET /stats`

## Kubernetes Secrets

The project requires these secrets:

- `calendar-db-secret`
  - database password
- `calendar-api-secret`
  - JWT secret
- `calendar-mail-secret`
  - SMTP credentials for email notifications  

<br>

------------------------------------------------------------------------

# Local Deployment
## Prerequisites

Before running the project, make sure the following tools are installed:

-   Docker Desktop
-   Minikube
-   kubectl
-   PowerShell (Windows)


## Project Architecture

User Request \| v LoadBalancer Service (calendar-api-service) \| v
Calendar API Pods (replicas = 2) \| \|-- PostgreSQL
(calendar-db-service) \| \|-- Redis (calendar-redis-service)

Components used in this deployment:

-   Calendar API -- Node.js REST service
-   PostgreSQL -- persistent relational database
-   Redis -- caching layer
-   PersistentVolumeClaim -- database storage
-   ConfigMap -- database initialization script
-   Secret -- database credentials
-   Deployment -- manages pod replicas
-   Service -- exposes pods through a load balancer


## Deployment Steps

### 1. Start Docker Desktop

Ensure Docker Desktop is running before starting Minikube.

### 2. Start Minikube

minikube start

### 3. Configure Docker to use Minikube Docker

Run this in every new terminal before building the image:

minikube docker-env \| Invoke-Expression

### 4. Build the API Image

docker build -t nodejs-image-v1 .

### 5. Deploy Kubernetes Resources

Run:

.`\deploy`{=tex}.bat

This deploys:

-   PostgreSQL Deployment + Service
-   Redis Deployment + Service
-   Calendar API Deployment + Service
-   PersistentVolumeClaim
-   ConfigMap
-   Secret

------------------------------------------------------------------------

# Accessing the Application

Expose the API with:

`minikube service calendar-api-service --url`

`kubectl port-forward service/calendar-api-service 3000:3000`

You will receive a URL similar to:

http://127.0.0.1:xxxxx

Example endpoints:

GET /events\
POST /events\
GET /stats

Example:

http://127.0.0.1:xxxxx/events

------------------------------------------------------------------------

# Useful Kubernetes Commands

Check cluster resources:

`kubectl get all`

Check pods:

`kubectl get pods`

View API logs:

`kubectl logs -f -l app=calendar-api`

Restart API deployment:

`kubectl rollout restart deployment calendar-api-deployment`

Delete a pod:

`kubectl delete pod `<pod-name>`{=html}`

Manually apply Kuernetes resources: 

`kubectl apply -f calendar-db-secret.yaml`

`kubectl apply -f calendar-api-secret.yaml`

`kubectl apply -f calendar-mail-secret.yaml`

`kubectl apply -f db-pvc.yaml`

`kubectl apply -f postgres-init-configmap.yaml`

`kubectl apply -f calendar-db-deployment.yaml`

`kubectl apply -f calendar-db-service.yaml`

`kubectl apply -f calendar-redis-deployment.yaml`

`kubectl apply -f calendar-redis-service.yaml`

`kubectl apply -f calendar-api-deployment.yaml`

`kubectl apply -f calendar-api-service.yaml`

------------------------------------------------------------------------

# Resetting the Database

To wipe the database:

`kubectl delete pvc db-pvc`

Then redeploy:

`.\deploy{=tex}.bat`

------------------------------------------------------------------------

# Troubleshooting

ImagePullBackOff / ErrImagePull:

Make sure you ran:

minikube docker-env \| Invoke-Expression

before building the image.

Database stuck in Pending:

kubectl get pvc

Check API logs if API is not responding:

kubectl logs -l app=calendar-api

------------------------------------------------------------------------

# Notes

-   API runs **2 replicas**
-   Health checks use the **/stats endpoint**
-   PostgreSQL data persists using **PersistentVolumeClaim**
-   Redis provides caching
