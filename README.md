# CSM Dashboard

This project provides a simple Customer Success Manager (CSM) dashboard acting as a central operating system. It demonstrates how a small team might manage customer risk mitigation plans, upsell or cross-sell opportunities, success stories, and executive business reviews using a lightweight web application.

The app uses IndexedDB for local data storage and serves a responsive web interface built with HTML, CSS, and JavaScript. It is intended as a proof of concept and starting point for further customization.

## Features

- View a unified list of accounts and tasks
- Track OKRs: risk mitigation plans, upsell/cross-sell opportunities, customer success stories, and executive meetings
- Add, update, and delete tasks directly from the dashboard
- Basic search and filters
- Local data persistence using IndexedDB

## Setup

1. Serve the files in this repository from a static web host or a local server. For local testing you can run:

   ```bash
   python3 -m http.server 8080
   ```

   Then open `http://localhost:8080/` in your browser.

2. The app will automatically create and initialize the local database on first load.

## Data Structure

Tasks are stored with the following properties:
- `id`: Auto-incrementing unique identifier
- `name`: Task description
- `type`: One of "Risk", "Upsell", "Story", or "EBC"
- `due`: Optional due date
- `createdAt`: Timestamp of when the task was created

## Contributing

Contributions are welcome! Please open issues or pull requests to suggest improvements. When submitting code, follow conventional commit messages and ensure any new features include documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.


