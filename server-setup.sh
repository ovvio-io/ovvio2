#!/bin/bash
BUILD_NAME="ovvio_x64_linux_3.0.0.0"
wget https://ovvio2-release.s3.amazonaws.com/$BUILD_NAME.zip
unzip $BUILD_NAME.zip
mkdir serverdata
chmod +x $BUILD_NAME
./$BUILD_NAME -d ./serverdata >> ovvio.log &
setsid ./$BUILD_NAME -d ./serverdata >> ovvio.log 2>&1 < /dev/null &
