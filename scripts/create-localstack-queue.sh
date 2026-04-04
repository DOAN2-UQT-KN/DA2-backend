#!/usr/bin/env bash
set -e

awslocal sqs create-queue --queue-name durable-background-job \
  --attributes VisibilityTimeout=120,ReceiveMessageWaitTimeSeconds=20

awslocal sqs create-queue --queue-name notification-send \
  --attributes VisibilityTimeout=120,ReceiveMessageWaitTimeSeconds=20

awslocal sqs create-queue --queue-name report-analysis-job \
  --attributes VisibilityTimeout=120,ReceiveMessageWaitTimeSeconds=20