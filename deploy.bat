echo [1/3] Building Docker image...
docker build -t pcdelight/calendar-api:latest .

echo [2/3] Pushing image to Docker Hub...
docker push pcdelight/calendar-api:latest

echo [3/3] Syncing Kubernetes manifests...

kubectl apply -f .\calendar-db-secret.yaml
kubectl apply -f .\calendar-api-secret.yaml
kubectl apply -f .\calendar-mail-secret.yaml

kubectl apply -f .\db-pvc.yaml
kubectl apply -f .\postgres-init-configmap.yaml

kubectl apply -f .\calendar-db-deployment.yaml
kubectl apply -f .\calendar-db-service.yaml

kubectl apply -f .\calendar-redis-deployment.yaml
kubectl apply -f .\calendar-redis-service.yaml

kubectl apply -f .\calendar-api-deployment.yaml
kubectl apply -f .\calendar-api-service.yaml

echo [*] Triggering rolling restart for API...
kubectl rollout restart deployment calendar-api-deployment