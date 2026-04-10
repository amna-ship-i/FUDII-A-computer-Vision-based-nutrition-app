# Füdii Backup and Recovery Plan

This document outlines the comprehensive backup and recovery strategy for the Füdii application to ensure data integrity, minimize downtime, and provide clear procedures for handling different failure scenarios.

## Backup Strategy

### Database Backups

#### PostgreSQL Database

| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| Full Backup | Daily (2 AM UTC) | 30 days | Primary: Cloud Storage <br> Secondary: Off-site |
| Incremental Backup | Hourly | 7 days | Cloud Storage |
| Transaction Logs | Continuous | 7 days | Cloud Storage |
| Pre-deployment Backup | Before each production deployment | Until next deployment | Cloud Storage |

**Implementation:**

```bash
# Example script for daily full backup
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="fudii_production"
BACKUP_DIR="/backup/postgresql"
BACKUP_FILE="${BACKUP_DIR}/fudii_${TIMESTAMP}.sql"
S3_BUCKET="fudii-backups"

# Create backup
pg_dump -U postgres -d ${DB_NAME} > ${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_FILE}

# Upload to cloud storage
aws s3 cp ${BACKUP_FILE}.gz s3://${S3_BUCKET}/daily/

# Verify backup integrity
aws s3 cp s3://${S3_BUCKET}/daily/$(basename ${BACKUP_FILE}.gz) /tmp/
gunzip -t /tmp/$(basename ${BACKUP_FILE}.gz)
if [ $? -eq 0 ]; then
  echo "Backup verified successfully"
else
  echo "Backup verification failed" | mail -s "Füdii Backup Alert" admin@fudii.com
fi

# Clean up old backups (keep last 30 days)
find ${BACKUP_DIR} -name "fudii_*.sql.gz" -type f -mtime +30 -delete
aws s3 ls s3://${S3_BUCKET}/daily/ | awk '{print $4}' | sort | head -n -30 | xargs -I {} aws s3 rm s3://${S3_BUCKET}/daily/{}
```

### File Storage Backups

#### User Uploads & ML Training Data

| Content | Backup Type | Frequency | Retention |
|---------|-------------|-----------|-----------|
| User Food Images | Synchronized | Daily | Indefinite |
| ML Training Data | Synchronized | Daily | Indefinite |
| Barcode Scan Images | Synchronized | Daily | 90 days |

**Implementation:**

```bash
# Example script for synchronizing user uploads to redundant storage
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SOURCE_BUCKET="fudii-user-uploads"
BACKUP_BUCKET="fudii-backups-user-uploads"
LOG_FILE="/var/log/fudii/backup_sync_${TIMESTAMP}.log"

# Sync user uploads to backup bucket
aws s3 sync s3://${SOURCE_BUCKET}/ s3://${BACKUP_BUCKET}/ --delete >> ${LOG_FILE} 2>&1

# Verify sync
aws s3 ls s3://${SOURCE_BUCKET}/ --recursive | wc -l > /tmp/source_count.txt
aws s3 ls s3://${BACKUP_BUCKET}/ --recursive | wc -l > /tmp/backup_count.txt

if cmp -s /tmp/source_count.txt /tmp/backup_count.txt; then
  echo "Sync verified successfully" >> ${LOG_FILE}
else
  echo "Sync verification failed" | mail -s "Füdii Sync Alert" admin@fudii.com
fi
```

### Application Code and Configuration

| Content | Backup Type | Frequency | Storage |
|---------|-------------|-----------|---------|
| Application Code | Version Control | Every commit | GitHub/GitLab |
| Configuration Files | Encrypted Backup | After changes | Secure cloud storage |
| Environment Variables | Encrypted Backup | After changes | Secure cloud storage |
| Deployment Scripts | Version Control | Every commit | GitHub/GitLab |

## Recovery Procedures

### Database Recovery

#### Complete Database Failure

**Recovery Time Objective (RTO):** 1 hour
**Recovery Point Objective (RPO):** 15 minutes

**Procedure:**

1. Provision new database instance if needed
2. Download most recent full backup from cloud storage
3. Apply all available transaction logs
4. Verify database integrity
5. Update connection strings if using a new instance
6. Restart application services

```bash
# Example recovery script
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="fudii_production"
BACKUP_BUCKET="fudii-backups"
LATEST_BACKUP=$(aws s3 ls s3://${BACKUP_BUCKET}/daily/ | sort | tail -n 1 | awk '{print $4}')
LOG_DIR="/var/log/fudii"
RECOVERY_LOG="${LOG_DIR}/recovery_${TIMESTAMP}.log"

# Download latest backup
aws s3 cp s3://${BACKUP_BUCKET}/daily/${LATEST_BACKUP} /tmp/ >> ${RECOVERY_LOG} 2>&1

# Extract backup
gunzip /tmp/${LATEST_BACKUP} >> ${RECOVERY_LOG} 2>&1
EXTRACTED_FILE=$(echo /tmp/${LATEST_BACKUP} | sed 's/\.gz$//')

# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" >> ${RECOVERY_LOG} 2>&1
psql -U postgres -c "CREATE DATABASE ${DB_NAME};" >> ${RECOVERY_LOG} 2>&1

# Restore from backup
psql -U postgres -d ${DB_NAME} < ${EXTRACTED_FILE} >> ${RECOVERY_LOG} 2>&1

# Apply transaction logs
for logfile in $(aws s3 ls s3://${BACKUP_BUCKET}/transaction_logs/ | sort | awk '{print $4}'); do
  aws s3 cp s3://${BACKUP_BUCKET}/transaction_logs/${logfile} /tmp/ >> ${RECOVERY_LOG} 2>&1
  psql -U postgres -d ${DB_NAME} < /tmp/${logfile} >> ${RECOVERY_LOG} 2>&1
done

# Verify database
psql -U postgres -d ${DB_NAME} -c "SELECT COUNT(*) FROM users;" >> ${RECOVERY_LOG} 2>&1
if [ $? -eq 0 ]; then
  echo "Database recovery successful" | mail -s "Füdii Recovery Completed" admin@fudii.com
else
  echo "Database recovery failed" | mail -s "Füdii Recovery Failed" admin@fudii.com
fi
```

#### Partial Data Corruption

**Procedure:**

1. Identify affected tables/data
2. Place application in maintenance mode if necessary
3. Restore only affected tables from last known good backup
4. Verify restored data
5. Return application to normal operation

### File Storage Recovery

**Recovery Time Objective (RTO):** 2 hours
**Recovery Point Objective (RPO):** 24 hours

**Procedure:**

1. Identify missing or corrupted files
2. Restore files from backup storage
3. Verify file integrity
4. Update file metadata in database if needed

```bash
# Example script for restoring specific files
#!/bin/bash
SOURCE_PATH=$1
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_BUCKET="fudii-backups-user-uploads"
RESTORE_PATH="/tmp/restore_${TIMESTAMP}"
LOG_FILE="/var/log/fudii/restore_${TIMESTAMP}.log"

# Create restore directory
mkdir -p ${RESTORE_PATH}

# Download files from backup
aws s3 cp s3://${BACKUP_BUCKET}/${SOURCE_PATH} ${RESTORE_PATH} --recursive >> ${LOG_FILE} 2>&1

# Verify downloaded files
find ${RESTORE_PATH} -type f | wc -l >> ${LOG_FILE}

# Restore to primary storage
aws s3 cp ${RESTORE_PATH} s3://fudii-user-uploads/${SOURCE_PATH} --recursive >> ${LOG_FILE} 2>&1

echo "Restore completed: ${SOURCE_PATH}" | mail -s "Füdii File Restore" admin@fudii.com
```

### Application Recovery

**Recovery Time Objective (RTO):** 30 minutes
**Recovery Point Objective (RPO):** No data loss (code is version controlled)

**Procedure:**

1. Identify issue with current deployment
2. Roll back to last known good deployment
3. Verify application functionality
4. If necessary, restore database to match code version

```bash
# Example rollback script
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPO_URL="git@github.com:fudii/fudii-app.git"
TARGET_COMMIT=$1  # Commit hash to roll back to
LOG_FILE="/var/log/fudii/rollback_${TIMESTAMP}.log"

# Stop application
systemctl stop fudii-app >> ${LOG_FILE} 2>&1

# Backup current code
cp -r /opt/fudii /opt/fudii-backup-${TIMESTAMP} >> ${LOG_FILE} 2>&1

# Checkout target version
cd /opt/fudii
git fetch >> ${LOG_FILE} 2>&1
git checkout ${TARGET_COMMIT} >> ${LOG_FILE} 2>&1

# Install dependencies
npm install >> ${LOG_FILE} 2>&1

# Start application
systemctl start fudii-app >> ${LOG_FILE} 2>&1

# Verify application status
sleep 10
curl -s http://localhost:5000/health | grep "ok" >> ${LOG_FILE} 2>&1
if [ $? -eq 0 ]; then
  echo "Rollback successful" | mail -s "Füdii Rollback Completed" admin@fudii.com
else
  echo "Rollback failed" | mail -s "Füdii Rollback Failed" admin@fudii.com
fi
```

## Disaster Recovery

### Complete System Failure

In case of a catastrophic failure affecting all production systems:

1. Activate the emergency response team
2. Provision new infrastructure in backup region
3. Restore database from latest backup
4. Deploy application code
5. Restore file storage from backups
6. Update DNS settings to point to new infrastructure
7. Verify system functionality
8. Notify users of potential data loss (if any)

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour

### Regular Testing

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Database Restore | Monthly | Restore to test environment |
| File Recovery | Quarterly | Sample file restoration |
| Full Disaster Recovery | Bi-annually | Complete system recovery |

## Backup Monitoring and Verification

### Monitoring

- Automated monitoring of backup jobs
- Email notifications for failed backups
- Dashboard showing backup status and history
- Weekly backup report to operations team

### Verification

- Automated integrity checks of database backups
- Sample restoration tests
- Verification of backup file counts and sizes
- Log analysis for backup processes

## Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| Database Administrator | Configure and monitor database backups<br>Perform database recovery when needed |
| DevOps Engineer | Set up automated backup systems<br>Maintain backup infrastructure<br>Test disaster recovery procedures |
| Application Developer | Ensure application handles recovery scenarios gracefully<br>Implement data integrity checks |
| Operations Manager | Review backup reports<br>Authorize disaster recovery processes<br>Coordinate recovery efforts |

## Data Retention and Compliance

- User data backups: Retained according to privacy policy (30 days after account deletion)
- Financial data: Retained for 7 years
- System logs: Retained for 90 days
- ML training data: Retained indefinitely (anonymized)

## Continuous Improvement

This backup and recovery plan will be reviewed and updated:

1. After each recovery incident
2. When new systems or data stores are added
3. Quarterly, as part of regular security reviews
4. When regulatory requirements change

Last updated: April 2025