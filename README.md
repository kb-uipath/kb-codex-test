# CSM Dashboard

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

## Setup

1. Clone this repository:
   ```bash
   git clone [repository-url]
   cd csm-dashboard
   ```

2. Serve the files using a local server. You have several options:

   Using Python:
   ```bash
   # Python 3
   python -m http.server 8080
   
   # Python 2
   python -m SimpleHTTPServer 8080
   ```

   Using Node.js:
   ```bash
   # Install http-server globally
   npm install -g http-server
   
   # Run the server
   http-server -p 8080
   ```

3. Open `http://localhost:8080` in your browser

4. The app will automatically create and initialize the local IndexedDB database on first load.

## Data Structure

Tasks are stored in IndexedDB with the following properties:
- `id`: Auto-incrementing unique identifier
- `name`: Task description
- `type`: One of "Risk", "Upsell", "Story", or "EBC"
- `due`: Optional due date
- `createdAt`: Timestamp of when the task was created

## Development

### Project Structure
- `index.html`: Main application interface
- `style.css`: Custom styles
- `app.js`: Application logic and IndexedDB operations
- `bootstrap.min.css`: Bootstrap framework styles
- `bootstrap.bundle.min.js`: Bootstrap JavaScript components

### Adding New Features
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Contributing

Contributions are welcome! Please open issues or pull requests to suggest improvements. When submitting code, follow conventional commit messages and ensure any new features include documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.


