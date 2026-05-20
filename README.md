# RestoTip by ParkoSpace

QR-based restaurant feedback and UPI tipping platform with two separate experiences:

- Public customer PWA: `client/customer`
- Private restaurant dashboard: `client/restaurant`
- Shared backend API: `server`

## Run locally

```bash
npm install
npm run seed
npm run dev
```

Apps:

- Customer app: `http://localhost:5173/r/spicehub`
- Restaurant dashboard: `http://localhost:5174/login`
- API: `http://localhost:4000`

Demo owner:

- Email: `owner@spicehub.in`
- Password: `password123`

## Structure

```text
client/
  customer/
  restaurant/
server/
```

The customer app is login-free and optimized for a fast mobile QR flow. The restaurant dashboard is authenticated with JWT and manages reviews, staff, one restaurant-wide QR code, and analytics.
