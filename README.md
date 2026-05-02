# ChamaChain Backend

Chama management system with role-based access, savings, loans, chat, and meeting minutes.

## Features

- 16 roles with granular permissions
- 3 pricing plans (Free, Members Only, Full + Money)
- Member management with invite system (auto/manual approval)
- Real-time chat (group + private)
- Meeting minutes with photo uploads and OCR
- Financial tracking (deposits, withdrawals, loans, fines)
- Enterprise-grade security (binary protocol, IP whitelist, session management)

## Tech Stack

- Node.js + Express
- PostgreSQL
- Socket.IO (WebSocket)
- Railway (Deployment)

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. Run `npm install`
3. Run `npm run migrate`
4. Run `npm run seed`
5. Run `npm start`

## API Documentation

Base URL: `http://localhost:8080/api/v1`

### Auth Endpoints
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `POST /auth/heartbeat` - Keep session alive
- `GET /auth/profile` - Get profile

### Chama Endpoints
- `POST /chamas` - Create chama
- `GET /chamas` - List user's chamas
- `GET /chamas/:id` - Get chama details

### Member Endpoints
- `GET /members/:chamaId` - List members
- `PUT /members/:chamaId/:memberId/role` - Update role
- `DELETE /members/:chamaId/:memberId` - Remove member

### Finance Endpoints
- `POST /finance/chamas/:chamaId/deposits` - Record deposit
- `POST /finance/chamas/:chamaId/withdrawals` - Request withdrawal
- `POST /finance/chamas/:chamaId/loans` - Request loan

## Deployment

Railway auto-deploys from GitHub. Set environment variables in Railway dashboard.

## License

MIT
