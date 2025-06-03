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

## Offline Capabilities

This application is designed to work completely offline once loaded. It uses IndexedDB for local data storage, ensuring that all your tasks and OKR metrics are available even without an internet connection. Any changes made while offline will be synchronized when you reconnect.

## Setup

1. Clone this repository:
   ```