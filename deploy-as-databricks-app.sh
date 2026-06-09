#!/usr/bin/env bash

# Prevent the script from being sourced, which would cause `set -e` and `exit` to close the user's terminal.
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  echo "Error: This script should not be sourced. Please run it directly using ./deploy-as-databricks-app.sh"
  return 1 2>/dev/null || exit 1
fi

set -e

# Navigate to the directory of this script (dmesh-viewer)
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Error: .env file not found in dmesh-viewer directory!"
  exit 1
fi

source .env

if [ -z "$DATABRICKS_EMAIL" ] || [ -z "$DB_PROFILE" ]; then
  echo "Error: Please ensure DATABRICKS_EMAIL and DB_PROFILE are set in your .env file."
  exit 1
fi

if [ -z "$API_APP_URL" ]; then
  echo "Error: Please ensure API_APP_URL is set in your .env file."
  exit 1
fi

echo "=========================================="
echo " 0. Parameterizing app.yaml"
echo "=========================================="
# Backup the original app.yaml and set up a trap to restore it on exit
cp app.yaml app.yaml.bak
trap 'mv app.yaml.bak app.yaml 2>/dev/null || true' EXIT

sed "s|\${API_APP_URL}|${API_APP_URL}|g" app.yaml.bak > app.yaml


echo "=========================================="
echo " 1. Building Vite React App"
echo "=========================================="
npm install
npm run build

echo "=========================================="
echo " 2. Syncing to Databricks Workspace"
echo "=========================================="
# Ensure app exists silently
if ! databricks apps get dmesh-viewer --profile "$DB_PROFILE" >/dev/null 2>&1; then
  echo "Creating new Databricks App: dmesh-viewer..."
  databricks apps create dmesh-viewer --profile "$DB_PROFILE"
fi

# Create a clean deployment folder to avoid syncing unnecessary files
DEPLOY_DIR=$(mktemp -d)
trap 'rm -rf "$DEPLOY_DIR"; mv app.yaml.bak app.yaml 2>/dev/null || true' EXIT

cp -R dist "$DEPLOY_DIR/"
cp app.yaml "$DEPLOY_DIR/"
cp app.py "$DEPLOY_DIR/"
cp requirements.txt "$DEPLOY_DIR/"

echo "Cleaning up remote workspace directory to ensure no unnecessary files remain..."
databricks workspace delete "/Workspace/Users/$DATABRICKS_EMAIL/dmesh-viewer" --recursive --profile "$DB_PROFILE" 2>/dev/null || true
databricks workspace mkdirs "/Workspace/Users/$DATABRICKS_EMAIL/dmesh-viewer" --profile "$DB_PROFILE" 2>/dev/null || true

databricks sync "$DEPLOY_DIR" "/Workspace/Users/$DATABRICKS_EMAIL/dmesh-viewer" --profile "$DB_PROFILE"

echo "=========================================="
echo " 3. Deploying Databricks App"
echo "=========================================="
databricks apps deploy dmesh-viewer --source-code-path "/Workspace/Users/$DATABRICKS_EMAIL/dmesh-viewer" --profile "$DB_PROFILE"

echo "Deployment complete! You can view the status in the Databricks UI."
