Calendar Manager API (Kubernetes Edition)
This project is a containerized Node.js application orchestrated by Kubernetes using Minikube. It features a persistent PostgreSQL 17 database and Redis for caching and activity statistics.

Prerequisites
Before you begin, ensure you have Docker Desktop, Minikube, and kubectl installed. Windows users should use PowerShell.

Deployment Steps
Start Minikube by running: minikube start.

Connect to Minikube Docker Environment: You must run "minikube docker-env | Invoke-Expression" in every new terminal window before building images so that Minikube can see your local Docker builds.

Build the Image: Run "docker build -t nodejs-image-v1 ." to build the application image directly into the Minikube registry.

Deploy Resources: Run "kubectl apply -f deploy.yaml" to deploy all components.

Management and Maintenance
To restart the API after code changes, run: kubectl rollout restart deployment calendar-api.

To delete a specific pod, run: kubectl delete pod [pod-name].

To stop and remove all resources, run: kubectl delete -f deploy.yaml.

To completely wipe the database and all saved data, run: kubectl delete pvc db-pvc.

To monitor the status of your deployment, run: kubectl get all.

To view live application logs, run: kubectl logs -f -l app=calendar-api.

Accessing the Application
Since the cluster runs in a virtual environment, you must forward the internal port to your local machine. Run "kubectl port-forward service/calendar-api-service 3000:3000" in a separate terminal.

You can then access the API events at http://localhost:3000/events and usage stats at http://localhost:3000/stats.

Troubleshooting
If you see an ErrImagePull error, ensure you ran the minikube docker-env command before building the image. If the database pod remains in a Pending state, verify that the storage addons are enabled and the PVC is bound. The initial database data from init.sql only loads if the database volume is empty; to re-initialize, you must delete the PVC and re-deploy.