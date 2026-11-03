# Benchmark Environment Specifications

- **Date**: 2026-11-02
- **Host Operating System**: Microsoft Windows 11 Home / Pro (x86_64)
- **CPU**: AMD Ryzen 7 7840HS w/ Radeon 780M Graphics (8 Cores, 16 Logical Processors, Base 3.8 GHz, Boost up to 5.1 GHz)
- **Host RAM**: 16.0 GB (16,030,588 KB visible physical memory)
- **Docker Engine**: Docker Community Engine v29.9.2 (build a82e528)
- **MySQL Container**: MySQL Community Server 8.0.46 (Linux container x86_64)
  - Port: `3307` mapped to `3306`
  - Engine: InnoDB
  - Character Set: `utf8mb4` / `utf8mb4_unicode_ci`
  - Database Name: `flowmetrics_bench`
- **Runtime Environment**:
  - Python: 3.13.7
  - Driver: PyMySQL 1.2.0 / SQLAlchemy 2.0.52
  - Node.js: v20+

