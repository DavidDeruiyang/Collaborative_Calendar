# AI Interaction Record

This file documents representative AI interactions that meaningfully influenced the project.

## Session Title: Entering PostgreSQL to Investigate a SQL Database Bug

### Prompt (you sent to AI)

Our backend is deployed in Kubernetes and we encountered a database issue. After updating both backend and frontend code, we observed a 502 server error. While debugging, we noticed that the backend did not appear to recognize a newly added database field.
<br>The specific prompt used was: "How do I check whether the updated init.sql in postgres-init-configmap.yaml was successfully deployed? There is a new database entry, "profile_picture TEXT", and I suspect this may be related to the 502 server error."

### AI Response (trimmed if long)

The AI suggested first checking whether the ConfigMap had actually been updated in the cluster by inspecting it directly. One suggested command was to retrieve the ConfigMap content and confirm that the new schema line existed. The AI also suggested that, because the database was already persistent, updating init.sql alone might not change an existing table schema. It therefore recommended adding the column manually in PostgreSQL with an ALTER TABLE statement if the column was missing.

### What Your Team Did With It

- The main issue was not located by AI. We independently traced the problem from the frontend first. The page showed a "Failed to load user" message, and we used Chrome Inspector to identify the underlying 502 server error. From there, we traced the relevant error location in homepage.html and inferred that the issue might be related to the newly added profile_picture field in the database layer.
- That reasoning was based on our own debugging of the application flow and our understanding that PostgreSQL data was persistent in the deployed environment. Because the database had already been initialized in an earlier version, changing init.sql in postgres-init-configmap.yaml would not automatically update the existing table schema.
- AI was helpful only at the later debugging stage. It suggested practical ways to verify whether the ConfigMap had been updated in the cluster and whether the missing column needed to be added manually. This was useful for confirming the deployment behavior, but it did not identify the root cause for us.

