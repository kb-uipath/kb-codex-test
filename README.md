# CSM Dashboard

#<<<<<<< codex/design-csm-dashboard-outline
=======
#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
=======
#<<<<<<< codex/design-csm-dashboard-outline
#>>>>>>> main
#>>>>>>> main
A lightweight "central operating system" for Customer Success Managers (CSMs). The dashboard helps manage risk mitigation plans, upsell or cross-sell opportunities, customer success stories, and executive business reviews.

Data persists in the browser via `localStorage`, so no external database is required. The app is built with plain HTML, CSS, and JavaScript.

## Features
- Unified list of accounts and tasks
- OKR tracking: risk mitigation, upsell/cross-sell, success stories, and executive meetings
- Add, edit, and delete tasks and accounts directly in the dashboard
- Search box and drop-down filters to quickly find tasks
- Responsive layout suitable for desktop or mobile use

## Setup
1. Clone this repository.
2. (Optional) copy `config.example.js` to `config.js` to customise the local storage keys.
3. Serve the files from a static host or run a simple local server:

   ```bash
   python3 -m http.server 8080
   ```
   Then open <http://localhost:8080/> in your browser.
   Use the search box and filter drop-down in the Tasks section to narrow results.

## Usage
1. Navigate between **Tasks**, **Accounts**, and **OKRs** using the sidebar.
2. Add new tasks or accounts with the forms provided.
3. Click the pencil icon to edit an entry or the trash can to remove it.
4. View OKR counts under the **OKRs** section.

### Sample Configuration
`config.example.js` contains the default storage keys:

```javascript
// config.js
// Customize the keys used in localStorage
window.STORAGE_KEY = 'csm_tasks';
window.ACCOUNT_KEY = 'csm_accounts';
```

Rename this file to `config.js` if you need to override the default keys. An `.env.example` file is also provided for potential future integrations.

## Development
See [BUILD_PLAN.md](BUILD_PLAN.md) for the project roadmap and planned milestones.

## Contributing
Contributions are welcome! Fork the repository, create a branch for your changes, and open a pull request. Please follow conventional commit messages and update documentation when adding new features. Additional guidelines are available in [CONTRIBUTING.md](CONTRIBUTING.md).

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
#<<<<<<< codex/design-csm-dashboard-outline
=======
=======
This project provides a simple Customer Success Manager (CSM) dashboard acting as a central operating system. It demonstrates how a small team might manage customer risk mitigation plans, upsell or cross-sell opportunities, success stories, and executive business reviews using a lightweight web application.

The app uses IndexedDB for local data storage and serves a responsive web interface built with HTML, CSS, and JavaScript. It is intended as a proof of concept and starting point for further customization.

## Features

- View a unified list of accounts and tasks
- Track OKRs: risk mitigation plans, upsell/cross-sell opportunities, customer success stories, and executive meetings
- Add, update, and delete tasks directly from the dashboard
- Filter tasks by type (Risk, Upsell, Story, EBC)
- View OKR metrics and progress
- Local data persistence using IndexedDB
- Responsive design with mobile support
- Real-time updates and error handling

## Offline Capabilities

This application is designed to work completely offline once loaded. It uses IndexedDB for local data storage, ensuring that all your tasks and OKR metrics are available even without an internet connection. Any changes made while offline will be synchronized when you reconnect.

## Setup

1. Clone this repository:
   ```
#>>>>>>> main
#>>>>>>> main
