# Deploying `dmesh-viewer` to Databricks Apps

This guide explains how to deploy the `dmesh-viewer` (a Vite-based React application) as a Databricks App. 

We use a hybrid deployment model: the frontend is built locally using Node.js/Vite, and the resulting static files are served by a small Python FastAPI backend running on Databricks Apps.

## 1. Prerequisites

### Environment Variables
You must configure your Databricks workspace details. Create a `.env` file in the root of the `dmesh-viewer` directory containing:

```bash
DATABRICKS_EMAIL="your-databricks-email"
DB_PROFILE="<your-databricks-profile>"
DATABRICKS_WORKSPACE_URL="https://<your-databricks-workspace-url>"
API_APP_URL="https://<your-databricks-workspace-url>/dmesh-viewer"
```

### Databricks CLI
Ensure the Databricks CLI is installed and you are authenticated using OAuth.
```bash
# Authenticate to your workspace (if you haven't already)
export DATABRICKS_WORKSPACE_URL="https://<your-databricks-workspace-url>"
databricks auth login --host $DATABRICKS_WORKSPACE_URL
```

## 2. Configuration Files

The repository includes the following files to enable Databricks deployment:

- **`app.yaml`**: Informs Databricks how to start the FastAPI server. The port is hardcoded to 8000 in the command.
- **`requirements.txt`**: Specifies the Python dependencies (`fastapi` and `uvicorn`) needed to serve the application.
- **`app.py`**: A lightweight FastAPI application that serves the `dist/` directory. It mounts the assets and provides a fallback to `index.html` to support the Single Page Application (SPA) routing.

## 3. Deploying

To streamline the deployment process, we have provided an automated deployment script `deploy-as-databricks-app.sh`.

When you execute this script, it will:
1. Run `npm install` and `npm run build` locally to generate the static `dist/` folder.
2. Ensure the `dmesh-viewer` Databricks App exists in your workspace.
3. Sync the necessary files (`dist/`, `app.yaml`, `app.py`, `requirements.txt`) to your workspace directory.
4. Trigger the app deployment.

```bash
./deploy-as-databricks-app.sh
```

## Troubleshooting

### `401 Unauthorized` on App Access
If you are unable to access the app after deployment or if a Service Principal using it returns a 401 error, verify that the appropriate permissions (`CAN_USE`) are granted on the Databricks App. You can manage these permissions via the Databricks UI under Compute > Apps, or via the Databricks CLI:

```bash
# Check permissions
databricks apps get-permissions dmesh-viewer --profile <your-databricks-profile>
```
