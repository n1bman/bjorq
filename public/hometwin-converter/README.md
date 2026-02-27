# HomeTwin Converter — Home Assistant Add-on

Converts OBJ/MTL/DAE + textures into optimized GLB files for HomeTwin.
Runs locally on the HA host — no data leaves your network.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `200 OK` if add-on is running |
| `POST` | `/convert` | Accepts multipart `file` (ZIP). Returns `{ "jobId": "..." }` |
| `GET` | `/status/:jobId` | Returns `{ "state": "queued|converting|done|error", "percent": 0-100, "message": "..." }` |
| `GET` | `/result/:jobId` | Returns the optimized GLB (`application/octet-stream`) |

All requests require `Authorization: Bearer <HA long-lived access token>`.
The add-on is accessed via HA Ingress: `https://<ha>/api/hassio_ingress/hometwin_converter/...`

## Conversion pipeline

1. Extract uploaded ZIP
2. Find OBJ+MTL or DAE files
3. Load with `trimesh` (Python)
4. Resize textures to max 2048px
5. Merge duplicate materials
6. Export as binary GLTF (.glb)
7. Optionally apply Draco compression

## config.yaml (HA Add-on manifest)

```yaml
name: HomeTwin Converter
version: "1.0.0"
slug: hometwin_converter
description: Converts SketchUp OBJ/DAE exports to optimized GLB for HomeTwin
url: "https://github.com/example/hometwin-converter"
arch:
  - amd64
  - aarch64
ingress: true
ingress_port: 8099
panel_icon: mdi:cube-scan
startup: application
options: {}
schema: {}
```

## Dockerfile outline

```dockerfile
FROM python:3.11-slim

RUN pip install --no-cache-dir \
    trimesh[easy] \
    pygltflib \
    flask \
    pillow \
    numpy

COPY server.py /app/server.py
WORKDIR /app

EXPOSE 8099
CMD ["python", "server.py"]
```

## server.py outline

```python
from flask import Flask, request, jsonify, send_file
import trimesh
import uuid, os, threading

app = Flask(__name__)
jobs = {}  # jobId -> { state, percent, message, result_path }

@app.route("/health")
def health():
    return "OK"

@app.route("/convert", methods=["POST"])
def convert():
    f = request.files["file"]
    job_id = str(uuid.uuid4())
    upload_path = f"/tmp/{job_id}.zip"
    f.save(upload_path)
    jobs[job_id] = {"state": "queued", "percent": 0, "message": "Köad"}
    threading.Thread(target=run_conversion, args=(job_id, upload_path)).start()
    return jsonify({"jobId": job_id})

@app.route("/status/<job_id>")
def status(job_id):
    return jsonify(jobs.get(job_id, {"state": "error", "message": "Unknown job"}))

@app.route("/result/<job_id>")
def result(job_id):
    job = jobs.get(job_id)
    if not job or job["state"] != "done":
        return "Not ready", 404
    return send_file(job["result_path"], mimetype="application/octet-stream")

def run_conversion(job_id, zip_path):
    try:
        jobs[job_id].update(state="converting", percent=10, message="Extraherar...")
        # Extract, load with trimesh, optimize, export GLB
        import zipfile
        extract_dir = f"/tmp/{job_id}"
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(extract_dir)

        # Find OBJ or DAE
        import glob
        obj_files = glob.glob(f"{extract_dir}/**/*.obj", recursive=True)
        dae_files = glob.glob(f"{extract_dir}/**/*.dae", recursive=True)

        jobs[job_id].update(percent=30, message="Laddar modell...")
        if obj_files:
            scene = trimesh.load(obj_files[0])
        elif dae_files:
            scene = trimesh.load(dae_files[0])
        else:
            raise Exception("No OBJ or DAE found")

        jobs[job_id].update(percent=70, message="Exporterar GLB...")
        result_path = f"/tmp/{job_id}.glb"
        scene.export(result_path, file_type="glb")

        jobs[job_id].update(state="done", percent=100, message="Klar!", result_path=result_path)
    except Exception as e:
        jobs[job_id].update(state="error", percent=0, message=str(e))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8099)
```
