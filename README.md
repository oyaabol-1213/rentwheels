# RentWheels
 
### Vehicle Rental & Bicol Tour Van Booking System
 
A web-based vehicle rental and tour van booking platform that makes booking easier and more convenient. RentWheels
lets customers explore vehicles, reserve rental dates on a calendar, and book a tour van for destinations around the
Bicol Region.
 
Developed as a final project for **Systems Analysis and Design (BSIT)**.
 
---
 
## Preview
 
### Homepage
 
![RentWheels Homepage](screenshots/homepage.png)
 
### Vehicles
 
| Vehicle categories | Reservation request form |
| :---: | :---: |
| ![Vehicles](screenshots/vehicles.png) | ![Reservation form](screenshots/vehicles-rent.png) |
 
### Tour Van
 
| Tour van reservation | Bicol route board |
| :---: | :---: |
| ![Tour Van](screenshots/tourvan.png) | ![Tour routes](screenshots/tourvan-route.png) |
 
### Admin Dashboard
 
![Admin Dashboard](screenshots/adminpanel.png)
 
---

## Features

**For Customers**
- Account registration and login
- Browse vehicles by category
- Reserve vehicles with an interactive booking calendar
- Book tour vans with customizable trip details
- View and cancel personal bookings
- Manage profile information
- Submit customer reviews
- Booking confirmation before submitting requests

**For Administrators**
- Dashboard with system statistics
- Manage customer booking requests
- Approve or reject vehicle and tour van reservations
- Monitor vehicles, users, bookings, and reviews

**For Super Administrators**
- Add vehicles with photos and details
- Update vehicle information
- Manage vehicle availability
- Delete vehicles
- Set vehicle status to Available, Limited, or Unavailable

---

## Built With
 
| Technology   | Purpose                      |
| ------------ | ---------------------------- |
| React 18     | Frontend                     |
| React Router | Page navigation              |
| Tailwind CSS | UI styling                   |
| Axios        | API requests                 |
| Vite         | Development and build tool   |
| Laravel      | Backend framework            |
| PHP          | Backend programming language |
| MySQL        | Database                     |
 
---
 
## Project Structure
 
```
rentwheels/
├── frontend/       # React application
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/        # Laravel application
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── public/
│   └── tests/
│
├── screenshots/    # Images used in this README
└── README.md
```
 
---
 
## Getting Started
 
### Requirements
 
- PHP 8.3+
- Composer
- Node.js 18+
- MySQL
- XAMPP (recommended)
### 1. Clone the Repository
 
```bash
git clone https://github.com/oyaabol-1213/rentwheels.git
cd rentwheels
```
 
### 2. Set Up the Database
 
1. Start MySQL using XAMPP.
2. Open phpMyAdmin.
3. Create a database named `vehicle_rentals`.
4. Import `backend/database/vehicle_rentals.sql`.
### 3. Configure the Backend
 
```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
```
 
> On Mac or Linux, use `cp .env.example .env` instead of `copy`.
 
Check the database settings in your `.env` file:
 
```env
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
 
Add the newest tables and columns (vehicle photos and the extra booking details), then start the server:
 
```bash
php artisan migrate
php artisan serve
```
 
Backend URL: `http://localhost:8000`
 
### 4. Configure the Frontend
 
Open another terminal:
 
```bash
cd frontend
npm install
npm run dev
```
 
Frontend URL: `http://localhost:5173`
 
---
 
## Default Admin Account
 
The database file includes a Super Admin account:
 
| Email                   | Role        |
| ----------------------- | ----------- |
| `admin@rentwheels.com`  | Super Admin |
 
Ask your group for the password. Customers create their own accounts from the **Log in → Sign up** panel.
 
---
 
## Booking Status
 
| Status    | Description                                          |
| --------- | ---------------------------------------------------- |
| Pending   | Waiting for administrator approval                   |
| Confirmed | Booking request approved                             |
| Cancelled | Cancelled by the customer (while pending) or by an admin |
| Completed | The rental or tour is finished                       |
 
---
 
## Running Tests
 
```bash
cd backend
php artisan test
```
 
The tests cover booking availability, double-booking prevention, add-on prices, vehicle photo upload,
vehicle status changes and validation of the booking forms.
 
---
 
## Project Information
 
|              |                             |
| ------------ | --------------------------- |
| **Project**  | RentWheels                  |
| **Category** | Web-Based Booking System    |
| **Course**   | BSIT                        |
| **Subject**  | Systems Analysis and Design |
| **Frontend** | React + Tailwind CSS        |
| **Backend**  | Laravel + PHP               |
| **Database** | MySQL                       |
 
---
 
## License
 
This project was developed for academic purposes.
 
---
 
**RentWheels** | Making every trip easier, one booking at a time.
 
