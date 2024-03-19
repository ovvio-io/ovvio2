#!/bin/bash
cd /home/ec2-user
wget https://ovvio2-release.s3.amazonaws.com/repo.zip
unzip repo.zip

sudo systemctl stop ovvio.service
rm serverdata.zip
zip -r serverdata.zip serverdata/
./repo dedup serverdata
sudo systemctl start ovvio.service
rm repo
rm repo.zip
