# POS System

A Django point-of-sale system with one role-aware login, an Admin Back Office, cashier checkout, branch-level inventory, purchasing, activity history, reports, and saved cashier Z Readings. Django ORM uses PostgreSQL in local development and production; production PostgreSQL is provided by Prisma Postgres through Vercel.

## Run locally (Windows)

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Install PostgreSQL locally and create a database and login role (or create them in pgAdmin). Set your local connection string and secret in the root `.env` file, replacing every example value:

```dotenv
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
```

Use URL-encoded special characters in the database username or password. Run database migrations and start Django:

```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

Open <http://127.0.0.1:8000/>. The first migration creates a Main Branch and Cash, Card, and Cheque payment methods.

The root `.env` file is ignored by Git. Do not commit it or put real database credentials in tracked files.
An existing local database file is retained as an ignored backup only; Django and Vercel no longer use or package it. Arrange any needed record import into PostgreSQL before removing that backup.

Create the initial administrator with Django's password-hashed account creation command:

```powershell
python manage.py createsuperuser
```

The custom user manager assigns the Admin role automatically to superusers. Sign in at the single login page and use **Maintenance → User** to create Cashier accounts. Select the cashier's branch, choose Cashier, and set a password. The same login routes Admins to Back Office and Cashiers to Cashiering. Use Django's `createsuperuser` command only for the initial administrator; later user accounts should be managed in the application.

## Main workflows

- Add departments, units, suppliers, and products under Maintenance / File.
- Create a Delivery / Purchase to receive stock and record supplier payables.
- Admins can record bad orders and stock adjustments; each stock change creates a movement record.
- Cashiers search or scan product codes, build a cart, process a payment, and print the persisted receipt.
- Cashiers review today's totals and close their shift once with a permanent Z Reading. Completed shifts cannot accept more sales that business day.
- Back Office reports show inventory and movement, sales, payables, activity history, and prior Z Readings. Admins can void a sale before the cashier's day has been closed; stock is restored and the void is recorded.

## Deploying to Vercel

Vercel deploys Django while Django ORM connects directly to the Prisma Postgres database using its PostgreSQL backend. No Prisma ORM or Prisma schema is used. In the Vercel dashboard:

1. Create a Prisma Postgres database from the Vercel Marketplace/Storage integrations and connect it to the Vercel project.
2. Import the GitHub repository and select the project root as the Root Directory.
3. In **Project → Settings → Environment Variables**, add these variables for Production (and Preview/Development too if those deployments need a database):
   - `DATABASE_URL`: the PostgreSQL connection URL provided by the Prisma Postgres integration.
   - `DJANGO_SECRET_KEY`: a long, randomly generated private Django key.
   - `DEBUG`: `False`.
4. Keep the configured build command `python manage.py collectstatic --noinput`; `vercel.json` runs this to prepare static assets. The function bundles Django templates, migrations, template tags, and collected static files.
5. Deploy or redeploy from the Vercel dashboard. Migrations must be applied to the target database before application features requiring those tables are used; run `python manage.py migrate` against the same `DATABASE_URL` from a trusted environment.

Vercel provides deployment hostnames automatically. `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` include Vercel domains by default; set `ALLOWED_HOSTS` to a comma-separated list if you also use a custom domain. Production connections require TLS. Never commit `.env`, `DATABASE_URL`, or database credentials.
