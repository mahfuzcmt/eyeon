# PHPNuxBill Install + Migration Guide

A complete, tailored deployment plan for Mahfuz Ahmed's setup:
- MikroTik RB4011iGS+ on RouterOS 7.19.6 (PPPoE + Hotspot)
- ~22 existing PPPoE users on TNR
- Hotspot router (Tk 10/day vouchers)
- Bangladesh-based, bKash payment integration needed

**Total estimated time:** 4-6 hours over one weekend
**Total cost:** Tk 0 software + ~Tk 600/month VPS
**Result:** Cancel TNR, save Tk 1,200/month

---

## Phase 0 — Pre-flight (15 minutes)

### Backup your MikroTik first
Always do this before any migration. From Winbox/SSH:

```
/system backup save name=before-phpnuxbill-migration
/export hide-sensitive file=before-phpnuxbill-migration
```

Download both files (`.backup` and `.rsc`) to your laptop. **Do not skip this.**

### Get your bKash merchant credentials ready

If you don't have a bKash Merchant Account yet:
1. Apply at https://www.bkash.com/business/merchant-account
2. Need: Trade License (Web Innovation), NID, Bank account
3. Approval takes 5-10 business days

If you already have one, gather:
- App Key
- App Secret
- Merchant Username
- Merchant Password
- Whether you're on **Tokenized Checkout** or **Checkout (URL Based)** — for PHPNuxBill, Tokenized is recommended

You don't need bKash to deploy PHPNuxBill itself — you can launch with just manual payment entry first, then add bKash when ready.

### Get an SMS gateway ready (optional but recommended)

For Bangladesh, the supported providers in PHPNuxBill include several BD-specific options. Two reliable choices:

- **Alpha SMS** — alphasms.com — ~Tk 0.25/SMS, good API docs
- **BulkSMSBD** — bulksmsbd.com — similar pricing
- **MimSMS** — also popular for BD ISPs

Sign up, get API key. Top up with ~Tk 500 for testing.

---

## Phase 1 — Provision the VPS (30 minutes)

### Choose your provider

| Provider | Plan | Cost | Notes |
|---|---|---|---|
| **Hetzner CX22** | 2 vCPU, 4GB RAM, 40GB SSD | ~€4 (~Tk 530/mo) | Best value, EU/US datacenters |
| **DigitalOcean Basic** | 1 vCPU, 1GB RAM, 25GB SSD | $6/mo (~Tk 750) | Singapore datacenter (lower latency from BD) |
| **Vultr Cloud Compute** | 1 vCPU, 1GB RAM, 25GB SSD | $6/mo | Tokyo or Singapore for BD latency |
| **Local BD provider (Exonhost, IT Nut)** | Varies | Tk 500-1500/mo | Lowest latency, but reliability varies |

**Recommendation:** Hetzner CX22 if you have a credit card that works internationally. The slight latency from Europe doesn't matter for a control panel that fires occasional API calls — it only matters for user-facing traffic, which goes through your MikroTik directly, not the panel.

### Provision the server

1. Choose **Ubuntu 24.04 LTS** as the OS
2. Add your SSH public key during creation (don't use root password if possible)
3. Note the public IP — we'll call it `YOUR_VPS_IP` in this guide

### Initial server hardening

SSH in as root, then:

```bash
# Update everything
apt update && apt upgrade -y

# Create non-root user
adduser webinnovation
usermod -aG sudo webinnovation

# Copy SSH keys to new user
mkdir /home/webinnovation/.ssh
cp ~/.ssh/authorized_keys /home/webinnovation/.ssh/
chown -R webinnovation:webinnovation /home/webinnovation/.ssh
chmod 700 /home/webinnovation/.ssh
chmod 600 /home/webinnovation/.ssh/authorized_keys

# Disable root SSH login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Install firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Now log out and reconnect as `webinnovation`.

### Point a domain at the VPS

You need a domain for HTTPS to work properly (bKash webhooks require HTTPS).

Pick something like `billing.webinnovation.com.bd` or `panel.yourdomain.com`. Set an A record pointing to `YOUR_VPS_IP`.

If you don't own a domain yet, **Cloudflare Registrar** sells `.com` domains at cost (~$10/year) and gives you free DNS + DDoS protection. Or buy a `.com.bd` domain locally for ~Tk 1,200/year.

DNS propagation takes 5 minutes to 24 hours. While waiting, continue with Phase 2.

---

## Phase 2 — Install PHPNuxBill via Docker (1 hour)

Docker is the fastest, cleanest way. No fighting PHP versions, no Apache configs.

### Install Docker

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in for the group change to take effect.

### Set up the project

```bash
mkdir -p ~/phpnuxbill
cd ~/phpnuxbill
```

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: mariadb:10.11
    container_name: phpnuxbill-db
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MARIADB_DATABASE: phpnuxbill
      MARIADB_USER: phpnuxbill
      MARIADB_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./db-data:/var/lib/mysql
    networks:
      - internal

  app:
    image: animegasan/phpnuxbill:latest
    container_name: phpnuxbill-app
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "127.0.0.1:8080:80"   # only expose to localhost; nginx will proxy
    volumes:
      - ./app-data:/var/www/html/uploads
    networks:
      - internal

networks:
  internal:
    driver: bridge
```

Create `.env` with strong passwords:

```bash
cat > .env <<EOF
DB_ROOT_PASSWORD=$(openssl rand -base64 24)
DB_PASSWORD=$(openssl rand -base64 24)
EOF
chmod 600 .env
```

**Save these passwords somewhere safe** — you'll need the `DB_PASSWORD` during the PHPNuxBill installer step. View them with `cat .env`.

Start the containers:

```bash
docker compose up -d
docker compose logs -f
# Wait for "ready for connections" from MariaDB and "Apache started" from app
# Press Ctrl+C to exit logs (containers keep running)
```

Verify it's running:

```bash
curl -I http://localhost:8080
# Should return HTTP/1.1 200 OK or a redirect
```

---

## Phase 3 — Configure Nginx + HTTPS (30 minutes)

### Install Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Create Nginx config

Replace `panel.yourdomain.com` with your actual domain:

```bash
sudo tee /etc/nginx/sites-available/phpnuxbill <<'EOF'
server {
    listen 80;
    server_name panel.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/phpnuxbill /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Get HTTPS certificate

Wait until your domain's DNS has propagated (test with `dig panel.yourdomain.com` — should return your VPS IP). Then:

```bash
sudo certbot --nginx -d panel.yourdomain.com --agree-tos --email you@example.com --redirect
```

Certbot auto-updates your Nginx config to redirect HTTP→HTTPS and adds the cert. Auto-renewal is set up automatically.

Test in browser: `https://panel.yourdomain.com` — you should see the PHPNuxBill installer screen.

---

## Phase 4 — Run PHPNuxBill installer (15 minutes)

In your browser, go to `https://panel.yourdomain.com/install`.

Fill in:
- **Database Host:** `db`  (the docker-compose service name, NOT localhost)
- **Database Port:** `3306`
- **Database Name:** `phpnuxbill`
- **Database User:** `phpnuxbill`
- **Database Password:** the `DB_PASSWORD` from your `.env` file
- **Admin Username:** `admin`
- **Admin Password:** something strong, write it down

Click Install. You should see "Installation Successful."

**Critical security step:** Delete the installer files immediately:

```bash
docker exec phpnuxbill-app rm -rf /var/www/html/install
```

Now log in at `https://panel.yourdomain.com/admin` with your admin credentials.

---

## Phase 5 — Add your MikroTik routers to PHPNuxBill (30 minutes)

### Step 5.1 — Create a dedicated API user on each MikroTik

You don't want PHPNuxBill using `admin` credentials. Create a restricted user.

On your **PPPoE router** (RB4011), via terminal/Winbox:

```
/user group add name=phpnuxbill-api policy=read,write,api,rest-api,!ftp,!sniff,!sensitive,!romon
/user add name=phpnuxbill group=phpnuxbill-api password=<GENERATE_STRONG_PASSWORD_HERE>
```

Use `openssl rand -base64 24` on your VPS to generate a strong password.

Repeat the same on your **Hotspot router** (the second one).

### Step 5.2 — Make sure routers are reachable from VPS

PHPNuxBill needs to reach each MikroTik over the internet. Three options:

**Option A: Public IP on MikroTik (easiest if you have one)**

If your Starlink gives you a public IP (most don't — Starlink uses CGNAT), or you have port-forwarded access via your local NTTN, just use that IP. Open port 8728 (legacy API) or 443 (REST API) on your router for inbound from your VPS only.

```
/ip firewall filter
add chain=input action=accept src-address=YOUR_VPS_IP protocol=tcp dst-port=8728 comment="PHPNuxBill API"
add chain=input action=accept src-address=YOUR_VPS_IP protocol=tcp dst-port=443 comment="PHPNuxBill REST"
```

**Option B: WireGuard tunnel (recommended)**

Since Starlink uses CGNAT, you probably can't get inbound traffic. Use WireGuard from MikroTik to your VPS — MikroTik initiates the tunnel outward, no inbound port needed.

On VPS, install WireGuard server:
```bash
sudo apt install -y wireguard
wg genkey | sudo tee /etc/wireguard/server.key | wg pubkey | sudo tee /etc/wireguard/server.pub
sudo chmod 600 /etc/wireguard/server.key

sudo tee /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.99.0.1/24
ListenPort = 51820
PrivateKey = $(sudo cat /etc/wireguard/server.key)

[Peer]
# Will fill in after MikroTik generates keys
PublicKey = MIKROTIK_PUBLIC_KEY_HERE
AllowedIPs = 10.99.0.2/32

[Peer]
PublicKey = HOTSPOT_ROUTER_PUBLIC_KEY_HERE
AllowedIPs = 10.99.0.3/32
EOF

sudo ufw allow 51820/udp
sudo systemctl enable --now wg-quick@wg0
```

On MikroTik (RouterOS 7.x):
```
/interface wireguard add name=wg-vps listen-port=51820 mtu=1420
/interface wireguard print
# Note the public-key shown — you'll paste this on VPS in PublicKey

/interface wireguard peers add interface=wg-vps endpoint-address=YOUR_VPS_IP endpoint-port=51820 \
  public-key="VPS_PUBLIC_KEY" allowed-address=10.99.0.0/24 persistent-keepalive=25s
/ip address add address=10.99.0.2/24 interface=wg-vps
```

Now your VPS reaches MikroTik at `10.99.0.2`. This is far more secure than exposing the API port to the internet.

**Option C: Use TNR's existing OVPN tunnel infrastructure**

You already have `SmartISP_Remote` OpenVPN tunnel from TNR. You could re-purpose this concept — set up your own OpenVPN server on the VPS — but WireGuard (Option B) is simpler and faster.

### Step 5.3 — Add routers in PHPNuxBill admin panel

Log in to PHPNuxBill admin. Go to **Settings → Routers** (or **Routers** in left menu, depending on version).

Click **Add Router**. Fill in for **PPPoE router**:

- **Name:** `Main PPPoE Router`
- **IP Address:** `10.99.0.2` (WireGuard) or your public IP
- **Username:** `phpnuxbill`
- **Password:** the strong password from Step 5.1
- **Status:** Enabled

Click Save, then click **Cek Now** (or "Test Connection") — should show ✅ Connected.

If it fails:
- Check `ping 10.99.0.2` from VPS
- Check `nc -zv 10.99.0.2 8728` (legacy API port) or `8729` (API-SSL)
- Verify the user exists: from MikroTik `/user print where name=phpnuxbill`
- Check MikroTik firewall isn't blocking input from WireGuard interface

Repeat for **Hotspot router**.

---

## Phase 6 — Migrate your existing data (1-2 hours)

This is where it gets specific. Two phases: import customers from MikroTik, then enrich with TNR data.

### Step 6.1 — Import plans (PPPoE profiles)

In PHPNuxBill admin, go to **Plans → Add Plan**.

For each of your existing MikroTik profiles (`default`, `75Mbps`, `90Mbps`), create a matching plan:

| Plan name | Type | Price (BDT) | Bandwidth | Validity | Mikrotik Profile |
|---|---|---|---|---|---|
| 50 Mbps Monthly | PPPoE | 800 | (auto from profile) | 30 days | `default` |
| 75 Mbps Monthly | PPPoE | 1200 | (auto from profile) | 30 days | `75Mbps` |
| 90 Mbps Monthly | PPPoE | 1500 | (auto from profile) | 30 days | `90Mbps` |

**Use your actual prices** — I'm guessing. The "Mikrotik Profile" field is critical: it must match the exact profile name in your router.

For hotspot, create:
| Plan name | Type | Price | Validity |
|---|---|---|---|
| 1 Day Pass | Hotspot | 10 | 24 hours |
| 3 Day Pass | Hotspot | 25 | 72 hours |
| 7 Day Pass | Hotspot | 50 | 168 hours |

### Step 6.2 — Get TNR customer data

Before cancelling TNR, log into their panel and look for:
- **Customer Export** / **CSV Download** — should give you names, phones, addresses
- **Reports → Customer List** — printable view you can save as PDF

If they don't offer export, email TNR support: *"Please provide a CSV export of all my customer data. This is data I own per [TNR's Terms of Service]."* They legally should comply.

If they refuse — note this in case of any future dispute, then proceed with manual entry.

### Step 6.3 — Import customers via SQL (the fast way)

You have 22 customers. PHPNuxBill has a CSV import in some versions, but the most reliable method is direct DB insert. Here's a script.

First, get your existing PPPoE secrets from MikroTik. From terminal:

```
/ppp secret print detail without-paging
```

Copy the output to a file on your VPS, e.g. `~/mikrotik-secrets.txt`.

Now create an import script:

```bash
cd ~/phpnuxbill
nano import-customers.php
```

```php
<?php
// import-customers.php
// Run with: docker exec -i phpnuxbill-app php /var/www/html/import-customers.php

require_once '/var/www/html/system/boot.php';

// Map MikroTik profile name → PHPNuxBill plan ID
// Get plan IDs from PHPNuxBill admin → Plans (URL shows ?id=N)
$profileToPlanId = [
    'default' => 1,   // 50 Mbps Monthly
    '75Mbps'  => 2,   // 75 Mbps Monthly
    '90Mbps'  => 3,   // 90 Mbps Monthly
];

$routerId = 1;  // your PPPoE router ID in PHPNuxBill

// Paste your customer data as array of [username, password, profile, comment]
$customers = [
    // Manually fill these from your MikroTik /ppp secret print + TNR export
    // ['pppoe_username', 'pppoe_password', 'profile', 'expiry_date_yyyy-mm-dd', 'real_name', 'phone'],
    ['1212',                   'PASS_HERE', 'default', '2026-06-08', 'Customer 1212',                ''],
    ['1313',                   'PASS_HERE', '75Mbps',  '2026-06-08', 'Customer 1313',                ''],
    ['1414',                   'PASS_HERE', '75Mbps',  '2026-06-08', 'Customer 1414',                ''],
    ['1515',                   'PASS_HERE', '75Mbps',  '2026-06-08', 'Customer 1515',                ''],
    ['1616',                   'PASS_HERE', '75Mbps',  '2026-06-08', 'Customer 1616',                ''],
    ['prosenjeet.kp@gmail.com','PASS_HERE', '75Mbps',  '2026-06-08', 'Prosenjeet',                   ''],
    ['bablu.nal@ahad.net',     'PASS_HERE', '75Mbps',  '2026-06-08', 'Bablu (Nal)',                  ''],
    ['milon@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Milon',                        ''],
    ['mittun@ahad.net',        'PASS_HERE', '75Mbps',  '2026-06-08', 'Mittun',                       ''],
    ['zohurul@ahad.net',       'PASS_HERE', '90Mbps',  '2026-06-08', 'Zohurul',                      ''],
    ['anika@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Anika',                        ''],
    ['sumon@ahad.net',         'PASS_HERE', '90Mbps',  '2026-06-08', 'Sumon',                        ''],
    ['tuhin@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Tuhin',                        ''],
    ['alamgir@ahad.net',       'PASS_HERE', '75Mbps',  '2026-06-08', 'Alamgir',                      ''],
    ['shawon@ahad.net',        'PASS_HERE', '90Mbps',  '2026-06-08', 'Shawon',                       ''],
    ['rubel@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Rubel',                        ''],
    ['arif.nal@ahad.net',      'PASS_HERE', '75Mbps',  '2026-06-08', 'Arif (Nal)',                   ''],
    ['taher@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Taher',                        ''],
    ['masud@ahad.net',         'PASS_HERE', '75Mbps',  '2026-06-08', 'Masud',                        ''],
    ['nazmul@ahad.net',        'PASS_HERE', '75Mbps',  '2026-06-08', 'Nazmul',                       ''],
    ['hotspot',                'PASS_HERE', '90Mbps',  '2026-06-08', 'Hotspot Service',              ''],
    ['test',                   'PASS_HERE', '75Mbps',  '2026-06-08', 'Test User',                    ''],
];

$imported = 0;
$skipped = 0;

foreach ($customers as $c) {
    [$username, $password, $profile, $expiry, $name, $phone] = $c;

    // Check if customer already exists
    $existing = ORM::for_table('tbl_customers')
        ->where('username', $username)
        ->find_one();
    if ($existing) {
        echo "SKIP $username (already exists)\n";
        $skipped++;
        continue;
    }

    if (!isset($profileToPlanId[$profile])) {
        echo "SKIP $username (unknown profile: $profile)\n";
        $skipped++;
        continue;
    }

    $customer = ORM::for_table('tbl_customers')->create();
    $customer->username = $username;
    $customer->password = $password;
    $customer->fullname = $name;
    $customer->phonenumber = $phone;
    $customer->email = '';
    $customer->address = '';
    $customer->status = 'Active';
    $customer->service_type = 'PPPOE';
    $customer->created_by = 1;  // admin user
    $customer->created_at = date('Y-m-d H:i:s');
    $customer->save();

    // Create the user_recharge record (active subscription)
    $recharge = ORM::for_table('tbl_user_recharges')->create();
    $recharge->customer_id = $customer->id();
    $recharge->plan_id = $profileToPlanId[$profile];
    $recharge->namebp = $profile;
    $recharge->recharged_on = date('Y-m-d');
    $recharge->expiration = $expiry;
    $recharge->time = '23:59:59';
    $recharge->status = 'on';
    $recharge->method = 'Migration from TNR';
    $recharge->routers = $routerId;
    $recharge->type = 'PPPOE';
    $recharge->save();

    echo "OK $username (plan: $profile, expiry: $expiry)\n";
    $imported++;
}

echo "\n=== Done ===\n";
echo "Imported: $imported\n";
echo "Skipped:  $skipped\n";
```

**Important caveats:**
- The exact PHPNuxBill table names and columns can vary by version — verify by browsing the DB before running
- This script does NOT push users to MikroTik (since they're already there). PHPNuxBill will manage them on next renewal/expiry
- Actual PPPoE passwords should be filled in from your MikroTik export (the `password` field in `/ppp secret print detail`)

To verify table structure first:

```bash
docker exec -it phpnuxbill-db mysql -uphpnuxbill -p phpnuxbill
# password from .env
SHOW TABLES;
DESCRIBE tbl_customers;
DESCRIBE tbl_user_recharges;
exit
```

Adjust the script if column names differ (PHPNuxBill v2024+ may use different schemas than v2025/2026).

Run the import:
```bash
docker cp import-customers.php phpnuxbill-app:/var/www/html/
docker exec phpnuxbill-app php /var/www/html/import-customers.php
```

### Step 6.4 — Verify and enrich

In PHPNuxBill admin → Customers, you should see all 22 imported with correct plans and expiry dates.

For each customer, click Edit and fill in:
- Real full name
- Phone number
- Address
- Email (optional)

This is ~10 minutes for 22 customers. Get it done in one sitting.

### Step 6.5 — Hotspot users

Skip migration. Hotspot users are short-term (24 hours). Just start fresh — generate a new batch of vouchers in PHPNuxBill and put them out for sale.

---

## Phase 7 — Configure hotspot captive portal (1 hour)

This redirects new hotspot users to PHPNuxBill's voucher entry page instead of MikroTik's default login.

### On MikroTik hotspot router

```
# Allow PHPNuxBill server through walled garden
/ip hotspot walled-garden
add dst-host=panel.yourdomain.com
add dst-host=*.bka.sh                 # bKash domains
add dst-host=*.bkash.com
add dst-host=tokenized.pay.bkash.com
add dst-host=cdn.tailwindcss.com      # if PHPNuxBill uses it
add dst-host=fonts.googleapis.com
add dst-host=fonts.gstatic.com

# Add VPS IP to walled garden by IP
/ip hotspot walled-garden ip
add dst-address=YOUR_VPS_IP action=accept
```

### Configure hotspot login template

The PHPNuxBill captive portal feature works by replacing your hotspot's login.html. The simplest approach is to redirect from MikroTik to PHPNuxBill on first hit.

In Files (Winbox), navigate to your hotspot HTML directory (e.g., `tnr-hotspot-login-v14-en-bn` based on your config). Edit `login.html` to add a redirect:

```html
<html>
<head>
<title>Redirecting...</title>
$(if error)
<meta http-equiv="refresh" content="0; url=$(link-orig)&msg=$(error)">
$(else)
<meta http-equiv="refresh" content="0; url=https://panel.yourdomain.com/captive/?nux-mac=$(mac)&nux-ip=$(ip)&nux-router-id=2">
$(endif)
</head>
<body>Redirecting...</body>
</html>
```

The user lands on PHPNuxBill's captive portal, enters voucher code or pays via bKash, and gets activated.

---

## Phase 8 — Install bKash plugin (30 minutes)

### Method 1 — Plugin Manager (preferred)

1. PHPNuxBill admin → **Plugins → Plugin Manager**
2. Search "bkash"
3. Click Install
4. Enter your bKash credentials in plugin settings:
   - App Key
   - App Secret
   - Username
   - Password
   - Mode: `production` (or `sandbox` for testing)
   - Callback URL: `https://panel.yourdomain.com/plugin/bkash/callback`

### Method 2 — Manual install

```bash
cd ~/phpnuxbill
git clone https://github.com/hotspotbilling/phpnuxbill-bkash.git
docker cp phpnuxbill-bkash phpnuxbill-app:/var/www/html/system/plugin/bkash
docker exec phpnuxbill-app chown -R www-data:www-data /var/www/html/system/plugin/bkash
```

Then configure via admin panel.

### Test the bKash flow (sandbox first)

1. Use bKash sandbox credentials first
2. Create a test voucher purchase from a phone
3. Use bKash sandbox test number to "pay"
4. Verify voucher activates automatically

Once sandbox works, switch to production credentials.

---

## Phase 9 — Test everything (1 hour)

### Test checklist

- ☐ Login to PHPNuxBill admin works
- ☐ All 22 PPPoE customers visible with correct plans + expiry dates
- ☐ Test creating a NEW PPPoE user via PHPNuxBill → verify it appears in MikroTik
- ☐ Test disabling a user via PHPNuxBill → verify session drops on MikroTik
- ☐ Test recording a manual payment → expiry extends correctly
- ☐ Test generating 10 hotspot vouchers → can print/export
- ☐ Test redeeming a voucher on captive portal → device gets internet
- ☐ Test bKash payment in sandbox → voucher auto-activates
- ☐ Test SMS sending (if configured)
- ☐ Confirm PHPNuxBill cron job is running (for auto-expiry):

  ```bash
  # PHPNuxBill needs a cron to check expiry
  # Add to host crontab:
  crontab -e
  # Add this line:
  */5 * * * * docker exec phpnuxbill-app php /var/www/html/cron.php > /dev/null 2>&1
  ```

### Run in parallel for 7 days

**Don't cancel TNR yet.** Run both systems in parallel:
- PHPNuxBill is your new primary
- TNR is read-only fallback (its API user is still active)
- New customer additions go through PHPNuxBill only
- Renewals get tested in PHPNuxBill

After 7 days of clean operation, proceed to cutover.

---

## Phase 10 — Cutover (30 minutes)

Pick a low-traffic time (3-5 AM Asia/Dhaka).

### On MikroTik (PPPoE router)

```
# Backup current state
/system backup save name=cutover-day-2026-XX-XX

# Disable TNR API user
/user disable [find name="tnrsoftApi-pAL"]

# Disable TNR OVPN tunnel
/interface ovpn-client disable [find name="SmartISP_Remote"]

# Optional: clean up TNR address-list (it's huge and now useless)
# Wait 1 month before doing this — keep as fallback in case you need to revert
# /ip firewall address-list remove [find list=SmartISP]
```

### On Hotspot router

Similar steps — disable TNR's API user there too.

### Watch for 24-48 hours

- Check PHPNuxBill cron is firing (logs)
- Verify expiring users get auto-disabled
- Verify any payments process correctly
- Monitor user complaints

If anything breaks, rollback is fast:
```
/user enable [find name="tnrsoftApi-pAL"]
/interface ovpn-client enable [find name="SmartISP_Remote"]
```

### Cancel TNR

After 7 more days of clean operation:
1. Email TNR: *"Please cancel my subscription effective immediately. Do not auto-renew."*
2. Confirm cancellation in writing
3. Remove their payment method (bKash/card auto-debit) if any
4. **Save Tk 1,200/month from this point on. ✅**

Total elapsed time from start: ~3 weeks (1 weekend setup + 2 weeks parallel running + cutover).

---

## Phase 11 — Operations (ongoing)

### Daily/Weekly tasks
- Spot-check expiring customers (PHPNuxBill dashboard)
- Review daily payments
- Check Uptime Kuma if you set it up

### Monthly tasks
- Database backup:
  ```bash
  docker exec phpnuxbill-db mysqldump -uphpnuxbill -p$DB_PASSWORD phpnuxbill > ~/backups/phpnuxbill-$(date +%Y-%m-%d).sql
  ```
  Add to cron for nightly auto-backup. Copy to S3/Backblaze for off-site safety.

- VPS security updates:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- Renew SSL cert (Certbot does this automatically, but verify):
  ```bash
  sudo certbot renew --dry-run
  ```

### After 3 months — review

Ask yourself:
1. Is PHPNuxBill meeting all my needs? (probably yes)
2. Are there gaps that custom software would fill? (probably small)
3. Is the saved Tk 1,200/month worth more than weekend dev time? (probably yes)
4. Do I have time/energy/desire to build the Spring Boot product? (depends on Voicely PTT progress)

If PHPNuxBill is fine — celebrate. You won. Move on to other projects.

If you spot a real gap (e.g., need multi-tenant for selling to other ISPs, or PHPNuxBill's UX is genuinely painful for your team), then revisit the Spring Boot plan with real production experience to guide the design.

---

## Troubleshooting

### "Cannot connect to router" in PHPNuxBill
- Test from VPS: `nc -zv 10.99.0.2 8728` (legacy API) or `8729` (API-SSL)
- Check WireGuard is up on both sides: `wg show` on VPS, `/interface wireguard print` on MikroTik
- Verify API user permissions: `/user print where name=phpnuxbill`
- Check MikroTik logs: `/log print where topics~"system"`

### Cron not running
- Verify host cron is set: `crontab -l`
- Test manually: `docker exec phpnuxbill-app php /var/www/html/cron.php`
- Check logs: `docker logs phpnuxbill-app`

### Database connection error
- Verify `.env` matches docker-compose env vars
- Check container linkage: `docker compose ps` — both containers should be `running`
- Try: `docker exec -it phpnuxbill-db mysql -uphpnuxbill -p phpnuxbill`

### bKash plugin failing
- Sandbox vs production credentials must match `mode` setting
- Callback URL must be HTTPS and reachable from bKash servers
- Check logs: `docker exec phpnuxbill-app tail -f /var/www/html/storage/logs/*.log`

---

## Resources

- PHPNuxBill GitHub: https://github.com/hotspotbilling/phpnuxbill
- Bkash plugin: https://github.com/hotspotbilling/phpnuxbill-bkash
- Plugin marketplace: PHPNuxBill admin → Plugins → Plugin Manager
- Telegram support group: search "PHPNuxBill" on Telegram
- bKash merchant docs: https://developer.bka.sh/

---

## Summary

| Phase | Time | Outcome |
|---|---|---|
| 0 — Pre-flight | 15 min | Backup, gather credentials |
| 1 — VPS provisioning | 30 min | Server ready, SSH hardened |
| 2 — Docker + PHPNuxBill | 1 hr | App running on localhost |
| 3 — Nginx + HTTPS | 30 min | Public HTTPS access |
| 4 — Installer | 15 min | DB initialized, admin login works |
| 5 — Routers | 30 min | Both MikroTiks connected |
| 6 — Migration | 1-2 hrs | All 22 customers in PHPNuxBill |
| 7 — Captive portal | 1 hr | Hotspot redirects to PHPNuxBill |
| 8 — bKash plugin | 30 min | Payments working in sandbox |
| 9 — Testing | 1 hr | Everything verified |
| 10 — Cutover | 30 min + 7 days | TNR cancelled |

**Total active time:** ~6-7 hours
**Total elapsed time:** ~3 weeks (mostly waiting/testing)
**Annual savings:** ~Tk 14,400
**ROI:** Pays for itself in week 1
