# Celery Setup for Raster Processing

This document provides instructions for setting up and running Celery with Redis for asynchronous raster layer processing in the Kampas backend.

## Prerequisites

- Redis server installed and running
- Python dependencies installed from requirements.txt

## Configuration

1. **Environment Variables**

   Add the following variables to your `.env` file:

   ```
   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/0
   ```

   You can modify the Redis URL according to your setup.

2. **Install Redis**

   - **Windows**: Download and install Redis from [https://github.com/tporadowski/redis/releases](https://github.com/tporadowski/redis/releases)
   - **Linux/macOS**: Use package manager (`apt-get install redis-server` or `brew install redis`)

## Running Celery

1. **Start Redis Server**

   ```
   # Windows
   redis-server

   # Linux/macOS
   sudo service redis-server start
   # or
   brew services start redis
   ```

2. **Start Celery Worker**

   From the project root directory:

   ```
   # Windows
   celery -A kampas_be worker -l info -P solo

   # Linux/macOS
   celery -A kampas_be worker -l info
   ```

## Monitoring Tasks

You can monitor Celery tasks using Flower:

1. **Install Flower**

   ```
   pip install flower
   ```

2. **Run Flower**

   ```
   celery -A kampas_be flower
   ```

   Then access the dashboard at http://localhost:5555

## Troubleshooting

- **Connection Refused**: Ensure Redis server is running
- **Task Not Found**: Ensure the Celery worker is running and the task is properly registered
- **Task Stuck**: Check for errors in the Celery worker logs

## Additional Resources

- [Celery Documentation](https://docs.celeryq.dev/)
- [Redis Documentation](https://redis.io/documentation)