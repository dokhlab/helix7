# Helix7 scheduled data refresh

The atlas is rebuilt from its upstream sources by `etl/update.py`, which:

1. clears the fetch cache so every source is re-downloaded fresh,
2. runs the full ETL pipeline (`run_all.py`),
3. records the run (timestamp, status, row counts) in the MariaDB
   `dataset_meta` table, which the site reads to show **"Data updated …"** in
   the footer.

Run it by hand any time with:

```bash
./run update
```

Pick **one** of the schedules below for production. A **monthly** cadence matches
how fast the sources actually change (GPCRdb, the Guide to PHARMACOLOGY, and the
Human Protein Atlas release a few times a year; PubMed counts drift slowly).

---

## Option A — cron (simplest; Linux/macOS server)

Edit the absolute path in `helix7-update.cron`, then install it:

```bash
crontab etl/deploy/helix7-update.cron   # or append the line to `crontab -e`
```

The default line runs at 03:30 on the 1st of each month.

## Option B — systemd timer (Linux server; preferred for servers)

```bash
sudo cp etl/deploy/helix7-update.service /etc/systemd/system/
sudo cp etl/deploy/helix7-update.timer   /etc/systemd/system/
# edit User= and WorkingDirectory= in the .service first
sudo systemctl daemon-reload
sudo systemctl enable --now helix7-update.timer
systemctl list-timers helix7-update.timer      # confirm next run
```

## Option C — launchd (macOS, survives reboots)

```bash
# edit the paths in the plist first
cp etl/deploy/com.helix7.update.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.helix7.update.plist
```

## Option D — GitHub Actions (no server; refreshes a hosted DB)

`.github/workflows/data-refresh.yml` runs on a monthly `schedule` (and on
manual `workflow_dispatch`). Set repository **secrets** `HELIX7_DBHOST`,
`HELIX7_DBPORT`, `HELIX7_DBNAME`, `HELIX7_DBUSER` and `HELIX7_DBPASS` for a
MariaDB/MySQL server reachable from GitHub's runners. This is the right choice
when the app is hosted with a managed database rather than on a self-managed
box.

---

### Notes

- All schedules ultimately call `python update.py`; they differ only in *what
  triggers* it.
- `update.py --keep-cache` reuses the cache (fast, for testing the wiring).
- `update.py --stages s03_gtopdb` refreshes only some sources (still re-derives
  aggregates and reloads the DB).
- Logs land in `etl/logs/` and are pruned after 90 days by `./run update`.
