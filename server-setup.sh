#!/bin/bash
BUILD_NAME="ovvio_x86_64_linux_3.0.0.0"
wget https://ovvio2-release.s3.amazonaws.com/$BUILD_NAME.zip
unzip $BUILD_NAME.zip
mkdir serverdata
mkdir logs
chmod +x $BUILD_NAME
./$BUILD_NAME -d ./serverdata > ./logs/$(date +"%Y-%m-%d-%T").log