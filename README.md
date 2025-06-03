# CSM Dashboard

A lightweight "central operating system" for Customer Success Managers (CSMs). The dashboard helps manage risk mitigation plans, upsell or cross-sell opportunities, customer success stories, and executive business reviews.

Data persists in the browser via `localStorage`, so no external database is required. The app is built with plain HTML, CSS, and JavaScript.

## Features
- Unified list of accounts and tasks
- OKR tracking: risk mitigation, upsell/cross-sell, success stories, and executive meetings
- Add, edit, and delete tasks and accounts directly in the dashboard
- Search box and drop-down filters to quickly find tasks

## Setup
1. Clone this repository.
2. (Optional) copy `config.example.js` to `config.js` to customise the local storage keys.
3. Serve the files from a static host or run a simple local server:

   ```bash
   python3 -m http.server 8080
   ```
   Then open <http://localhost:8080/> in your browser.
   Use the search box and filter drop-down in the Tasks section to narrow results.

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
Contributions are welcome! Fork the repository, create a branch for your changes, and open a pull request. Please follow conventional commit messages and update documentation when adding new features.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
