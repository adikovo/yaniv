# Quickstart: Deploying Yaniv (one-time setup runbook)

This is the click-by-click guide to take Yaniv live for $0. Work top to bottom. The code changes (env-driven URLs, CORS) are done by the implementation tasks; the steps below are the **host setup you do by hand once**, plus where to paste each config value.

> Mental model: **Client** = static files on Netlify (the CV URL). **Server** = your Node app on a free Oracle VM, with nginx adding HTTPS in front. CD = both auto-redeploy when you push to `main`.

---

## Config & secrets reference (fill in as you go)

| Name | Where it's set | Example value |
|---|---|---|
| `VITE_SERVER_URL` | Netlify → Site settings → Environment | `https://yaniv-xyz.duckdns.org` |
| `CLIENT_ORIGIN` | VM (pm2 env / `server/.env`) | `https://yaniv-card-game.netlify.app` |
| DuckDNS hostname | duckdns.org dashboard | `yaniv-xyz.duckdns.org` |
| VM public IP | Oracle console | `140.x.x.x` |
| `DEPLOY_SSH_HOST` | GitHub → Settings → Secrets | the VM public IP |
| `DEPLOY_SSH_USER` | GitHub secret | `ubuntu` |
| `DEPLOY_SSH_KEY` | GitHub secret | private deploy key (full text) |

---

## Part 1 — Provision the free VM (Oracle Cloud Always Free)

1. Sign up at cloud.oracle.com (a card is required for identity; Always Free resources are not charged).
2. Create a **Compute Instance**: image **Ubuntu 22.04**, shape **Ampere A1 (ARM)** if available, else **VM.Standard.E2.1.Micro**. Both are "Always Free eligible."
3. Download the SSH private key Oracle offers at creation (you'll log in with it).
4. Note the instance's **public IP**. Reserve it (Networking → reserved public IP) so it survives stop/start.
5. In the instance's subnet **Security List**, add ingress rules allowing **TCP 80** and **TCP 443** from `0.0.0.0/0`.
6. SSH in: `ssh -i <oracle-key> ubuntu@<public-ip>` and open the host firewall too:
   ```bash
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

## Part 2 — Run the server under pm2

```bash
# install Node LTS + git
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git

# clone the public repo and install server deps
git clone https://github.com/adikovo/yaniv.git ~/yaniv
cd ~/yaniv/server && npm ci --omit=dev

# run it under pm2, persist across reboot
sudo npm install -g pm2
pm2 start ./bin/www --name yaniv
pm2 save
pm2 startup        # run the sudo command it prints
```
Check `pm2 status` shows `yaniv` online. (At this point it's reachable only locally on :3000.)

## Part 3 — Free hostname (DuckDNS)

1. Log in at duckdns.org, create a subdomain (e.g. `yaniv-xyz`), set its IP to your VM's public IP.
2. (Safety net) add an updater cron so the record follows the IP:
   ```bash
   mkdir -p ~/duckdns && echo 'echo url="https://www.duckdns.org/update?domains=yaniv-xyz&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -' > ~/duckdns/duck.sh
   chmod +x ~/duckdns/duck.sh
   (crontab -l 2>/dev/null; echo '*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1') | crontab -
   ```

## Part 4 — nginx + HTTPS (Let's Encrypt)

```bash
sudo apt-get install -y nginx
```
Create `/etc/nginx/sites-available/yaniv` with the proxy + websocket block (see `ops/nginx-yaniv.conf` in the repo), pointing `server_name` at your DuckDNS host. Then:
```bash
sudo ln -s /etc/nginx/sites-available/yaniv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# get the TLS cert + auto-redirect + auto-renew
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yaniv-xyz.duckdns.org
```
certbot edits nginx to serve 443 and redirect 80→443, and installs a renewal timer. Visit `https://yaniv-xyz.duckdns.org` — you should reach the server over the padlock.

## Part 5 — Lock the server's allowed origin

Set `CLIENT_ORIGIN` to your Netlify URL (you'll have it after Part 6 — come back and set it, then `pm2 restart yaniv`). Easiest: a `server/.env` (gitignored) or pass via pm2:
```bash
cd ~/yaniv/server
echo 'CLIENT_ORIGIN=https://yaniv-card-game.netlify.app' >> .env
pm2 restart yaniv --update-env
```

## Part 6 — Client on Netlify

1. At app.netlify.com → **Add new site → Import from GitHub** → pick this repo.
2. Build settings (or let `client/netlify.toml` define them): base `client`, build `npm run build`, publish `client/dist`.
3. **Environment** → add `VITE_SERVER_URL = https://yaniv-xyz.duckdns.org`.
4. Deploy. Then **Site settings → Change site name** to your tidy CV URL (e.g. `yaniv-card-game` → `yaniv-card-game.netlify.app`).
5. Go back to **Part 5** and set `CLIENT_ORIGIN` to this exact Netlify URL.

Netlify now auto-rebuilds the client on every push to `main`.

## Part 7 — Automated server deploy (GitHub Actions)

1. On the VM, create a dedicated deploy keypair and authorize it:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
   cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/deploy_key            # copy this PRIVATE key
   ```
2. In GitHub → repo **Settings → Secrets and variables → Actions**, add:
   - `DEPLOY_SSH_HOST` = VM public IP
   - `DEPLOY_SSH_USER` = `ubuntu`
   - `DEPLOY_SSH_KEY` = the private key text from step 1
3. The `.github/workflows/deploy-server.yml` (added by implementation) runs after CI passes on `main` and SSHes in to run `ops/deploy.sh`. Merge something to `main` and watch the Actions tab.

## Part 8 — Verify (acceptance smoke)

- **SC-001 / no cold start**: leave it overnight, then open the Netlify URL cold → can host a game within seconds.
- **SC-002**: open two browsers, host + join, play a round end-to-end — no console security/CORS errors.
- **SC-003**: two pairs play two games at once without interference.
- **SC-005**: `sudo reboot` the VM; after it's back, the site works with no manual action (`pm2 status` shows `yaniv` online).
- **CD**: push a visible client tweak to `main` → live within minutes; push a server tweak → Actions deploy goes green and the server runs new code.

## Optional — uptime monitoring

Add a free UptimeRobot HTTP monitor on `https://yaniv-xyz.duckdns.org` for a public uptime badge and early warning if the VM drops. No code impact.
