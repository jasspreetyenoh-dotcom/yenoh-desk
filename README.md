# Yenoh Desk

Yenoh's internal desk for tasks, team and attendance. It runs at `desk.yenoh.in`, separate from the public website on `yenoh.in`.

## Run it on your computer

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3100. The first visit asks you to create the owner account.

On your computer, data is saved in the file `data/desk.db`. Online, it is saved in a Turso database instead. Nothing in the code changes between the two: the app uses Turso when `TURSO_DATABASE_URL` is set, and the local file when it is not.

## Who can do what

| Access | Can do |
|---|---|
| Owner | Everything: team, services and checklists, clients, tasks, repeating tasks |
| Lead | Create and assign tasks, review work, repeating tasks, clients, correct attendance |
| Member | Check in and out, see only their own tasks, tick the checklist, submit for review |

## How a task moves

To do → In progress → In review → Done. A member cannot submit until every checklist item is ticked. Sending work back unticks the checklist and shows your note to the member.

## Repeating tasks

Set a job once on the Repeating page. Desk creates the task on every due day, from the service's current checklist. Online, a daily job (`vercel.json`) runs at 6:00 AM India time, so tasks are ready before anyone logs in. Desk also creates any that are due whenever someone opens it. After a long gap, only the last 7 days are created.

All dates and times use India time.

## Notifications

Everyone has a **Notifications** bell in the sidebar with a count of unread items. Clicking a notification opens the task. People are told when:

- a task is given to them, or handed over to them (repeating tasks arrive as one combined message each morning)
- their work is sent back, with the note
- someone submits work for review (the owner and leads are told)
- they have work due today or overdue (a reminder every morning at 9:30 AM India time), and the owner and leads get one team summary

Notifications older than 60 days are cleared automatically.

### Email (optional)

Each notification can also be emailed. Each person can switch email off on their **Account** page. Without the settings below, Desk simply skips email and the bell still works.

1. Sign up at https://resend.com (the free plan is enough).
2. Add a sending domain. Use a subdomain such as `mail.yenoh.in`, so your normal `yenoh.in` email is not touched. Resend shows DNS records to add.
3. In Hostinger, open **Domains → yenoh.in → DNS records** and add the records exactly as Resend shows them. Then click **Verify** in Resend.
4. In Resend, create an **API key** with sending access.
5. In the Vercel project, add these settings (see `.env.example`), then redeploy:
   - `RESEND_API_KEY`: the key from step 4
   - `MAIL_FROM`: `Yenoh Desk <desk@mail.yenoh.in>`
   - `APP_URL`: `https://desk.yenoh.in`

If an email fails to send (for example the email service is down), the task and the bell notification are still saved, and the problem is written to the Vercel logs.

## Put it online at desk.yenoh.in

Your website is on Vercel, the code is on GitHub, and the domain is on Hostinger. Desk follows the same pattern, as its own project. You need to do the account steps yourself; each takes a few minutes.

### 1. Create the database (Turso)

1. Sign up at https://turso.tech (the free plan is enough) and create a database. Choose a region close to India.
2. Open the database and copy two values: its **URL** (starts with `libsql://`) and an **auth token** (use "Create token").

### 2. Put the code on GitHub

1. On GitHub, create a **new private, empty** repository called `yenoh-desk`. Do not add a README.
2. In a terminal inside the `desk` folder, run these one at a time (replace `YOUR-NAME`):

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Yenoh Desk"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/YOUR-NAME/yenoh-desk.git
```

```bash
git push -u origin main
```

The `.gitignore` already keeps your local data file and any secrets out of GitHub.

### 3. Create the Vercel project

1. In Vercel, choose **Add New → Project** and import `yenoh-desk`. Leave the settings as detected (Next.js).
2. Before deploying, add these **Environment Variables** (see `.env.example`):
   - `TURSO_DATABASE_URL`: the URL from step 1
   - `TURSO_AUTH_TOKEN`: the token from step 1
   - `CRON_SECRET`: any long random text (for example 40 random characters)
3. Click **Deploy**.

### 4. Create your owner account first

Open the address Vercel gives you (it ends in `.vercel.app`) and create the owner account **now, before adding the domain**. The very first visitor to an empty Desk becomes the owner, so do this before anyone else can find the address.

### 5. Connect desk.yenoh.in

1. In the Vercel project: **Settings → Domains → add `desk.yenoh.in`**. Vercel shows a DNS record to add, usually a CNAME.
2. In Hostinger: **Domains → yenoh.in → DNS / Nameservers → DNS records**, and add what Vercel shows. For a CNAME, the name is `desk` and the value is exactly what Vercel displays.
3. Wait a few minutes until Vercel shows the domain as valid, then open https://desk.yenoh.in.

### Good to know

- Vercel's free Hobby plan is meant for personal, non-commercial use. A business tool like Desk belongs on a paid Vercel plan.
- Local data (the `data` folder) is not copied online. Start fresh online, then add your real team, clients and services.
- Back up the Turso database from its dashboard, or use its backup features, before you rely on it.

## Changing the services and checklists

The owner edits them on the **Services** page. The starting list in `src/lib/db.js` is loaded only into an empty database.
