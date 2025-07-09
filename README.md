# AI Workflow Generator

This project is an AI-powered workflow generator that creates automation workflows (inspired by platforms like n8n and Zapier) from natural language descriptions. It consists of a Node.js/Express backend and a simple frontend.

## Features
- **AI Workflow Generation:** Converts user requests into detailed JSON workflow objects using OpenAI's GPT-4 API.
- **Fallback Workflow Generation:** If the AI is unavailable, a rule-based fallback generator creates basic workflows.
- **Workflow Testing:** Simulates workflow execution and returns mock results for each node.
- **Health Check Endpoint:** Verifies backend and OpenAI API status.

## Project Structure
```
backend/
  package.json
  server.js
frontend/
  frontend-html.html
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- An OpenAI API key (for full AI functionality)

### Installation
1. **Clone the repository:**
   ```powershell
   git clone <your-repo-url>
   cd ai-workflow-genrator/backend
   ```
2. **Install dependencies:**
   ```powershell
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the `backend` directory:
     ```env
     OPENAI_API_KEY=your_openai_api_key_here
     ```

### Running the Backend
```powershell
node server.js
```
The backend will start on `http://localhost:3001` by default.

### Using the Frontend
Open `frontend/frontend-html.html` in your browser. Make sure the backend is running.

## API Endpoints

### `POST /api/generate-workflow`
- **Description:** Generates a workflow from a natural language input.
- **Body:** `{ "input": "Describe your workflow here" }`
- **Response:** `{ success, workflow, model_used }`

### `POST /api/test-workflow`
- **Description:** Simulates execution of a workflow.
- **Body:** `{ "workflow": { ... } }`
- **Response:** `{ success, results }`

### `GET /api/health`
- **Description:** Health check for backend and OpenAI API status.
- **Response:** `{ status, timestamp, openai_configured }`

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required for AI workflow generation)

## Notes
- If the OpenAI API key is missing or quota is exceeded, the backend will use a fallback rule-based workflow generator.
- The project is designed for educational and prototyping purposes.

## License
MIT License
