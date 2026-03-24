# Automated Database Backup Setup (DigitalOcean)
## Step 1 
- Go to: DigitalOcean → Spaces → Create Space
- Name: `calendar-backups` (or sth else)
- Region: e.g. `nyc3`

---

## Step 2 — Create API Keys
- Go to: API → Spaces Keys → Generate
- Save:
  - Access Key
  - Secret Key

---

## Step 3 — Edit YAML (db-backup-cronjob.yaml)

Replace:

AWS_ACCESS_KEY_ID: "YOUR_DO_SPACES_KEY"  
AWS_SECRET_ACCESS_KEY: "YOUR_DO_SPACES_SECRET"  
SPACES_BUCKET: "YOUR_BUCKET_NAME"  
SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com"  

Example:

AWS_ACCESS_KEY_ID: "ABC123"  
AWS_SECRET_ACCESS_KEY: "XYZ456"  
SPACES_BUCKET: "calendar-backups"  
SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com"  

---

## Step 4 — Apply YAML

kubectl apply -f db-backup-cronjob.yaml

---

## Step 5 — Test Backup

kubectl create job --from=cronjob/postgres-backup-cronjob test-backup-job  
kubectl get pods  
kubectl logs <pod-name>  

---

## Step 6 — Verify Backup in Cloud

- Go to DigitalOcean Spaces
- Open your bucket
- Check for file:

calendar-backup-xxxx.sql

System now:
- runs daily backup automatically (can edit it to make it not daily)
