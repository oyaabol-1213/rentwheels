# RentWheels

A vehicle rental and Bicol tour van booking website. Customers can browse vehicles, reserve them for chosen dates,
and book a tour van. Admins manage vehicles and booking requests from a dashboard.

Built as the final project for **Systems Analysis and Design**.

## Features

**Customers**
- Sign up and log in (the login and sign-up panels slide in from the right)
- Browse vehicles by category (Featured, Coupe, SUV, Family Car, Sports, Bikes)
- Reserve a vehicle with a calendar that blocks dates that are already booked
- Book a tour van with a route, guests, pick-up details, optional emergency contact and add-ons
- An "Are you sure?" popup shows all the details before a request is sent
- View and cancel your own bookings in **My Bookings**
- Edit your profile and write reviews

**Admin and Super Admin**
- Dashboard with totals, users, vehicles, bookings and reviews
- Confirm or reject vehicle and tour booking requests
- Super Admin only: add a vehicle with a photo, set its status to **Available**, **Limited** or **Unavailable**, and delete vehicles

## Built with

| Part     | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, React Router, Axios, Tailwind CSS (Vite)  |
| Backend  | Laravel (PHP), JSON API                             |
| Database | MySQL (`vehicle_rentals`)                           |

## Project structure

```
frontend/   React website (pages, components, styles)
backend/    Laravel API (controllers, models, routes, migrations, tests)
```

## How to run it

You need: **PHP 8.3+**, **Composer**, **Node 18+** and **MySQL** (for example through XAMPP).

### 1. Database

1. Start MySQL.
2. Create a database named `vehicle_rentals`.
3. Import `backend/database/vehicle_rentals.sql` using phpMyAdmin or MySQL Workbench.

### 2. Backend (Laravel)

```
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Open `backend/.env` and check these settings:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vehicle_rentals
DB_USERNAME=root
DB_PASSWORD=
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

Then run:

```
php artisan migrate
php artisan serve
```

The API runs at `http://localhost:8000`.

### 3. Frontend (React)

Open a second terminal:

```
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Running the tests

```
cd backend
php artisan test
```

## Notes

- Vehicle photos uploaded by the Super Admin are saved in `backend/public/uploads/vehicles/`.
- Mobile numbers use the Philippine format, such as `09123456789`.
- A booking request stays **Pending** until an admin confirms it.
