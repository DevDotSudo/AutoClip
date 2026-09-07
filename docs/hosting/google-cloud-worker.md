# Hosted worker on Google Cloud Compute Engine

This runs the AutoClip worker on a remote Linux VM. The web app can remain on its current host; the worker only needs outbound access to Supabase, R2, and Gemini.

## VM

Create a Compute Engine VM with Ubuntu in `us-central1`, `us-east1`, or `us-west1`. Use the smallest machine that fits your workload; the free `e2-micro` is suitable only for small demos, while 2–4 GB RAM is safer for 200+ MB videos. Keep the VM, disk, and network within the provider's free-tier limits if a zero-cost deployment is required.

SSH into the VM and install Docker and Git:

```bash
sudo apt update
sudo apt install -y docker.io git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in after the group change, then clone the repository:

```bash
git clone https://github.com/YOUR_ACCOUNT/AutoClip.git
cd AutoClip
```

Create `.env.local` on the VM with the server-only Supabase service-role key, R2 credentials, and Gemini key:

```env
TRANSCRIPTION_PROVIDER=gemini
```

Never commit `.env.local` or copy it into the Docker image.

Build and start the worker:

```bash
docker build -f Dockerfile.worker -t autoclip-worker .
docker run -d --name autoclip-worker --restart unless-stopped --env-file .env.local autoclip-worker
docker logs -f autoclip-worker
```

The container's temporary files are created on the VM's temporary disk and removed after each job. Source assets and generated clips are stored in R2.

To update the worker:

```bash
git pull
docker build -f Dockerfile.worker -t autoclip-worker .
docker rm -f autoclip-worker
docker run -d --name autoclip-worker --restart unless-stopped --env-file .env.local autoclip-worker
```
