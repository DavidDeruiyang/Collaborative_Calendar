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

## Session Title: Fixing a Shared Session State Bug in Frontend Authentication

### Prompt (you sent to AI)

During testing,there is an issue where refreshing the page could result in incorrect user data being displayed. In some cases, one user's session appeared to overwrite another user's state, especially when multiple users were interacting with the system.

<br>The specific prompt used was:  
"How can frontend session storage cause user data to be shared or overwritten across different users after a page refresh? We are using sessionStorage to store JWT tokens."

### AI Response (trimmed if long)

The AI explained that browser storage mechanisms such as `sessionStorage` are scoped per browser tab, but issues can arise if application logic incorrectly reuses or overwrites stored values. It suggested checking whether the application was properly isolating user-specific data and ensuring that tokens and related state were consistently retrieved and updated.

The AI also recommended verifying that all API requests correctly use the current token from storage, and that no stale or shared state is reused across sessions.

### What Your Team Did With It

- The issue was initially identified through our own testing. We observed inconsistent user behavior after page refresh and suspected a problem with how session data was being handled on the frontend.

- We traced the issue through the frontend code and identified that session state was not being consistently isolated, leading to cases where outdated or incorrect token data could be used.

- AI assistance helped confirm our understanding of how `sessionStorage` works and highlighted potential pitfalls in session handling, but it did not directly locate the bug.

- Based on our own debugging and reasoning, we fixed the issue by ensuring that user session data is properly isolated and consistently retrieved from storage, preventing any possibility of one user's session overwriting another.

- After the fix, we verified that refreshing the page no longer causes incorrect user data to appear, ensuring reliable and consistent authentication behavior.