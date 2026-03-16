# Collaborative Calendar (Kubernetes Edition)

A cloud-native collaborative calendar platform that supports shared
event management with persistent storage. The system runs as a
containerized **Node.js API** deployed on **Kubernetes using Minikube**,
with **PostgreSQL 17** as the database and **Redis** for caching.

------------------------------------------------------------------------

# Prerequisites

Before running the project, make sure the following tools are installed:

-   Docker Desktop
-   Minikube
-   kubectl
-   PowerShell (Windows)

------------------------------------------------------------------------

# Project Architecture

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

------------------------------------------------------------------------

# Deployment Steps

## 1. Start Docker Desktop

Ensure Docker Desktop is running before starting Minikube.

## 2. Start Minikube

minikube start

## 3. Configure Docker to use Minikube Docker

Run this in every new terminal before building the image:

minikube docker-env \| Invoke-Expression

## 4. Build the API Image

docker build -t nodejs-image-v1 .

## 5. Deploy Kubernetes Resources

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

minikube service calendar-api-service --url

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

kubectl get all

Check pods:

kubectl get pods

View API logs:

kubectl logs -f -l app=calendar-api

Restart API deployment:

kubectl rollout restart deployment calendar-api-deployment

Delete a pod:

kubectl delete pod `<pod-name>`{=html}

------------------------------------------------------------------------

# Resetting the Database

To wipe the database:

kubectl delete pvc db-pvc

Then redeploy:

.`\deploy`{=tex}.bat

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
