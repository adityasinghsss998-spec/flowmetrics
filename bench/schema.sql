-- FlowMetrics Benchmark Database Schema (MySQL 8)
-- Matches exact production schema and indexes

DROP DATABASE IF EXISTS flowmetrics_bench;
CREATE DATABASE flowmetrics_bench CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flowmetrics_bench;

CREATE TABLE `repositories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `github_repo_id` bigint NOT NULL,
  `org_id` int NOT NULL,
  `owner_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `default_branch` varchar(100) DEFAULT 'main',
  `is_private` tinyint(1) DEFAULT '0',
  `webhook_id` bigint DEFAULT NULL,
  `last_synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `github_access_token` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `github_repo_id` (`github_repo_id`),
  KEY `repositories_github_repo_id` (`github_repo_id`),
  KEY `repositories_org_id` (`org_id`),
  KEY `repositories_owner_id` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pull_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `github_pr_id` bigint NOT NULL,
  `repo_id` int NOT NULL,
  `number` int NOT NULL,
  `title` text NOT NULL,
  `author_github_id` bigint NOT NULL,
  `author_username` varchar(100) NOT NULL,
  `state` enum('open','closed','merged') DEFAULT 'open',
  `base_branch` varchar(255) NOT NULL,
  `head_branch` varchar(255) NOT NULL,
  `additions` int DEFAULT '0',
  `deletions` int DEFAULT '0',
  `changed_files` int DEFAULT '0',
  `commits_count` int DEFAULT '0',
  `review_comments_count` int DEFAULT '0',
  `cycle_time_hours` decimal(10,2) DEFAULT NULL,
  `lead_time_hours` decimal(10,2) DEFAULT NULL,
  `first_review_at` datetime DEFAULT NULL,
  `pr_opened_at` datetime NOT NULL,
  `pr_merged_at` datetime DEFAULT NULL,
  `pr_closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pull_requests_repo_id_number` (`repo_id`,`number`),
  KEY `pull_requests_repo_id` (`repo_id`),
  KEY `pull_requests_author_github_id` (`author_github_id`),
  KEY `pull_requests_state` (`state`),
  KEY `pull_requests_pr_opened_at` (`pr_opened_at`),
  KEY `pull_requests_pr_merged_at` (`pr_merged_at`),
  KEY `pull_requests_lead_time_hours` (`lead_time_hours`),
  CONSTRAINT `pull_requests_ibfk_1` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `commits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sha` varchar(40) NOT NULL,
  `repo_id` int NOT NULL,
  `pr_id` int DEFAULT NULL,
  `author_github_id` bigint DEFAULT NULL,
  `author_username` varchar(100) DEFAULT NULL,
  `message` text,
  `additions` int DEFAULT '0',
  `deletions` int DEFAULT '0',
  `committed_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `commits_sha_repo_id` (`sha`,`repo_id`),
  KEY `commits_repo_id` (`repo_id`),
  KEY `commits_pr_id` (`pr_id`),
  KEY `commits_author_github_id` (`author_github_id`),
  KEY `commits_committed_at` (`committed_at`),
  CONSTRAINT `commits_ibfk_1` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `commits_ibfk_2` FOREIGN KEY (`pr_id`) REFERENCES `pull_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deployments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `github_deployment_id` bigint DEFAULT NULL,
  `repo_id` int NOT NULL,
  `environment` varchar(100) DEFAULT 'production',
  `status` enum('success','failure','pending','in_progress') DEFAULT 'pending',
  `sha` varchar(40) DEFAULT NULL,
  `deployed_by_username` varchar(100) DEFAULT NULL,
  `lead_time_hours` decimal(10,2) DEFAULT NULL,
  `deployed_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `build_duration_minutes` decimal(10,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `github_deployment_id` (`github_deployment_id`),
  KEY `deployments_repo_id` (`repo_id`),
  KEY `deployments_deployed_at` (`deployed_at`),
  KEY `deployments_status` (`status`),
  KEY `deployments_environment` (`environment`),
  KEY `deployments_completed_at` (`completed_at`),
  CONSTRAINT `deployments_ibfk_1` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pr_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `github_review_id` bigint NOT NULL,
  `pr_id` int NOT NULL,
  `repo_id` int NOT NULL,
  `reviewer_github_id` bigint NOT NULL,
  `reviewer_username` varchar(100) NOT NULL,
  `state` enum('approved','changes_requested','commented','dismissed') NOT NULL,
  `submitted_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `github_review_id` (`github_review_id`),
  KEY `pr_reviews_pr_id` (`pr_id`),
  KEY `pr_reviews_repo_id` (`repo_id`),
  KEY `pr_reviews_reviewer_github_id` (`reviewer_github_id`),
  KEY `pr_reviews_submitted_at` (`submitted_at`),
  CONSTRAINT `pr_reviews_ibfk_1` FOREIGN KEY (`pr_id`) REFERENCES `pull_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pr_reviews_ibfk_2` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

