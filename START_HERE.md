# MCMS - Start Here

This repository includes a portable demonstration setup so the project can be run without manually importing SQL, creating a `.env` file, or running `npm install` on the host machine.

## What is required

Install **Docker Desktop** once.

That is the only required setup for the portable demo.

## Run the full project

1. Download or clone the repository.
2. Make sure Docker Desktop is running.
3. Double-click **`START_DEMO.bat`**.
4. Wait for the browser to open at **http://localhost:3000**.

The launcher automatically starts:

- MySQL database
- Node.js/Express backend
- React frontend
- synthetic demo data

No MySQL Workbench import is required.

## Demo accounts

All demonstration accounts use the password:

`Demo1234!`

| Role | Email |
| --- | --- |
| Admin | `admin.demo@ncpg.gov.za` |
| Manager | `manager.demo@ncpg.gov.za` |
| Supervisor | `supervisor.demo@ncpg.gov.za` |
| HR Admin | `hr.demo@ncpg.gov.za` |
| Finance | `finance.demo@ncpg.gov.za` |
| Worker | `worker.demo@ncpg.gov.za` |
| Second Worker | `worker2.demo@ncpg.gov.za` |

## Reset the demo

Double-click **`RESET_DEMO.bat`**.

This deletes the local Docker demo database volume and recreates the original synthetic demonstration data.

## Stop the demo

Double-click **`STOP_DEMO.bat`**.

## Database access for demonstration

The Docker MySQL service is also exposed locally for optional inspection:

- Host: `localhost`
- Port: `3307`
- Database: `municipal_db`
- User: `mcms`
- Password: `mcms_demo_2026`

These are local demonstration credentials only. They are intentionally public because they protect only the disposable local demo container. They must not be used for a real deployment.

## Important privacy note

`database/demo_init.sql` contains only synthetic records. The real development database is **not** committed because the GitHub repository is public and the live database may contain employee names, contact details, biometric/profile data and password hashes.

## Worker face verification

The seeded worker accounts intentionally do not contain a real person's biometric face reference. This avoids publishing biometric data. To demonstrate face verification with a real person, register a new local demo employee through the application so the face reference is created only inside that person's local disposable demo database.

## If Docker is unavailable

The original development workflow still works with Node.js + MySQL using `.env.example`, but the Docker launcher is the recommended assessment/demo method because it avoids manual SQL setup and environment configuration.
