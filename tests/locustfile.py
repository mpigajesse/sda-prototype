"""
Load test: simulates concurrent ingest traffic from multiple tenant nodes.

Usage:
    locust -f tests/locustfile.py --headless -u 50 -r 10 --host http://localhost:8000
"""
import random
from locust import HttpUser, task, between


TENANT_IDS = [f"tenant_{i:03d}" for i in range(10)]
METRICS = ["cpu_usage", "memory_mb", "disk_io", "network_bps", "req_latency_ms"]


class SDANode(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(10)
    def ingest_metric(self):
        tenant = random.choice(TENANT_IDS)
        metric = random.choice(METRICS)
        self.client.post(
            "/api/v1/data/ingest",
            json={
                "tenant_id": tenant,
                "data": {
                    "metric": metric,
                    "value": round(random.uniform(0, 100), 2),
                    "node_id": f"node_{random.randint(1, 5)}",
                },
            },
            name="/api/v1/data/ingest",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="/health")

    @task(1)
    def reconcile(self):
        self.client.post("/api/v1/sync/reconcile", name="/api/v1/sync/reconcile")
