# Build Plan for CSM Dashboard

This document outlines the steps to implement a simple web-based CSM dashboard using Google Sheets as the data store.

## Goals
- Provide a responsive interface for viewing and updating customer tasks
- Track OKRs: risk mitigation, upsell/cross-sell, success stories, and EBC/QBRs
- Persist data to a Google Sheet through the public API

## Milestones
1. **Project Setup**
   - Create basic file structure (`index.html`, `style.css`, `app.js`)
   - Add configuration template (`config.example.js`) for the Google Sheet ID and API key
2. **Data Access Layer**
   - Implement minimal functions in `app.js` to read/write rows via the Google Sheets API
3. **UI Layout**
   - Build responsive layout with a sidebar for navigation and a main content area
   - Include sections for tasks, account summaries, and OKR tracking
4. **Task Management**
   - Display tasks from the sheet
   - Provide a form to add new tasks with fields for type (risk, upsell, etc.) and due date
5. **OKR Metrics**
   - Compute simple counts from the sheet (e.g., number of risk plans completed)
   - Display metrics at the top of the dashboard
6. **Polish**
   - Apply basic styling for readability and mobile support
   - Update README with usage and setup instructions

This plan keeps the implementation lightweight while demonstrating core functionality from the PRD.
