# CSM Dashboard

This project provides a simple Customer Success Manager (CSM) dashboard acting as a central operating system. It demonstrates how a small team might manage customer risk mitigation plans, upsell or cross-sell opportunities, success stories, and executive business reviews using a lightweight web application.

The app stores data in a Google Sheet and serves a responsive web interface built with HTML, CSS, and JavaScript. It is intended as a proof of concept and starting point for further customization.

## Features

- View a unified list of accounts and tasks
- Track OKRs: risk mitigation plans, upsell/cross-sell opportunities, customer success stories, and executive meetings
- Add and update tasks directly from the dashboard
- Basic search and filters

## Setup

1. Create a Google Sheet to act as your database. Share it with your Google Cloud project or publicly so the app can read/write rows.
2. Enable the **Google Sheets API** in your Google Cloud Console and create an API key.
3. Copy `config.example.js` to `config.js` and fill in your Spreadsheet ID and API key.
4. Serve the files in this repository from a static web host or a local server. For local testing you can run:

   ```bash
   python3 -m http.server 8080
   ```

   Then open `http://localhost:8080/` in your browser.
5. Ensure the browser can access the Google Sheets API. You may need to configure CORS or use a proxy depending on your setup.

### Configuration Example

```javascript
// config.js
window.SPREADSHEET_ID = 'your_google_sheet_id_here';
window.API_KEY = 'your_google_api_key_here';
```

Create a file named `config.js` with the values above. See `config.example.js` for a template. An optional `.env` file matching `.env.example` can be used if you integrate the dashboard with a build system that injects environment variables.

## Contributing

Contributions are welcome! Please open issues or pull requests to suggest improvements. When submitting code, follow conventional commit messages and ensure any new features include documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.


