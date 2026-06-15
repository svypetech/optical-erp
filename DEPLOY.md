# Deploying Business Ledger to Render (cheapest reliable option)

The app now uses SQLite stored on a persistent disk, so your data survives
restarts and redeploys.

## One-time setup

1. **Put the code on GitHub**
   - Create a free GitHub account if you don't have one.
   - Create a new empty repository (e.g. `business-ledger`).
   - Upload this whole folder to it (drag-and-drop on github.com works, or use Git).

2. **Create the Render service**
   - Sign up at https://render.com (free).
   - Click **New +  → Blueprint**.
   - Connect your GitHub and pick the `business-ledger` repo.
   - Render reads `render.yaml` automatically: it creates a web service with a
     1 GB persistent disk mounted at `/var/data`, where the SQLite database lives.
   - Click **Apply**.

3. **Wait for the first deploy** (a few minutes). When it's live, Render gives you
   a URL like `https://business-ledger.onrender.com`.

4. Open that URL, **Sign up** to create your single account, add your business
   (name, address, phone, logo), and start using it.

## Cost
- **Starter plan (~$7/month):** always on, no sleeping. Recommended for a shop.
- **Free plan:** works, but the service sleeps after inactivity and takes ~30s to
  wake on the next visit. Data still persists on the disk. To try it, change
  `plan: starter` to `plan: free` in `render.yaml` (and you can remove the `disk:`
  block only if you accept data loss — keep the disk to keep data).

## Updating later
- Push changes to GitHub → Render redeploys automatically. Your data on the
  `/var/data` disk is untouched.

## Your data / backups
- The database is a single file: `/var/data/ledger.db` on the Render disk.
- Use the in-app **Export Excel** button anytime to download a full backup.
- Render disks can also be backed up from the Render dashboard.
