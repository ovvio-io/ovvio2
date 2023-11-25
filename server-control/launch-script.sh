#!/bin/bash
CONTROL_URL="https://ovvio2-release.s3.amazonaws.com/ovvio-control-linux.gz"

cd /home/ec2-user
wget $CONTROL_URL
gzip -d ovvio-control-linux.gz
chmod +x ovvio-control-linux
chown ec2-user ovvio-control-linux

cd /etc/systemd/system
wget https://ovvio2-release.s3.amazonaws.com/ovvio.service
systemctl daemon-reload
systemctl start ovvio.service

