# Food Waste Redistribution System (FoodBridge)

A full-stack web application for connecting food donors with NGOs and shelters to reduce food waste and help communities in need.

## Overview

FoodBridge is designed to let:
- Donors post surplus food listings
- NGOs claim or accept donations
- Admins monitor approvals and platform metrics
- Users track status changes in real time

## Tech stack
- Node.js
- HTML / CSS / JavaScript
- Firebase-ready project structure
- Real-time JSON-based local persistence for quick bootstrapping

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Project structure

```text
.
├── .gitignore
├── database.js
├── firebase.json
├── firestore.indexes.json
├── index.html
├── package.json
├── PROJECT_SPEC.txt
├── README.md
├── run-app.bat
├── server.js
├── public/
│   └── index.html
└── data/
    └── foodbridge.db.json
```

## Notes

This repo includes the core app server, data layer, and a runnable landing page. Additional frontend pages can be added later as the UI expands.
