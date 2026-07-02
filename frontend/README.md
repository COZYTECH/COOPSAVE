# CoopSave Frontend

React admin dashboard for CoopSave.

## Stack

- React
- Vite
- Tailwind CSS
- React Router
- Axios

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API base URL. The default is:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Pages

- `/login`
- `/dashboard`
- `/cooperatives`
- `/members`
- `/reconciliation`

The dashboard and reconciliation pages listen for the `payment_received` Socket.IO event and refresh automatically.
