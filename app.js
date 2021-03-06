var noble = require("@abandonware/noble");
var fs = require("fs");
var hexToBinary = require("hex-to-binary");
var request = require("request");
var bleno = require("bleno");
var cmd = require('node-cmd');
var wifiReset = false

var headers = {
  'Content-Type': 'text/plain',
  'Accept': 'application/json'
};
var wifiOpenHabSsid, wifiOpenHabPwd
BleScan();

function BleScan() {
  noble.on('stateChange', function (state) {
    if (state === 'poweredOn') {
      noble.startScanning([], true);
    } else {
      noble.stopScanning();
    }
  });

  noble.on('discover', function (peripheral) {
    bleno.on('stateChange', function (state) {
      if (state === 'poweredOn') {
        var name = 'bHome';
        var serviceUuids = ['fb02af8af01411e981b42a2ae2dbcce4'];
        console.log(bleno.state)
        bleno.startAdvertising(name, serviceUuids, function (error) {
          console.log("AJUNGE start")
          if (error) console.log(error);
        });
        setTimeout(stopAdvertising, 7000)

      } else {
        bleno.stopAdvertising(function (error) {
          console.log("AJUNGE stop")
          if (error) console.log(error);
        });
      }
    });

    if (peripheral.advertisement.manufacturerData) {
      if (peripheral.advertisement.localName == "iSensor ") {
        console.log('peripheral discovered (' + peripheral.id +
          ' with address <' + peripheral.address + ', ' + peripheral.addressType + '>,' +
          ' connectable ' + peripheral.connectable + ',' +
          ' RSSI ' + peripheral.rssi + ':');
        console.log('\thello my local name is:');
        console.log('\t\t' + peripheral.advertisement.localName);
        console.log('\tcan I interest you in any of the following advertised services:');
        console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));

        var serviceData = peripheral.advertisement.serviceData;
        if (serviceData && serviceData.length) {
          console.log('\there is my service data:');
          for (var i in serviceData) {
            console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
          }
        }
        if (peripheral.advertisement.manufacturerData) {
          console.log('\there is my manufacturer data:');
          console.log('\t\t' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
          console.log(peripheral.advertisement.manufacturerData.toString("hex").indexOf("00005"));
        }
        if (peripheral.advertisement.txPowerLevel !== undefined) {
          console.log('\tmy TX power level is:');
          console.log('\t\t' + peripheral.advertisement.txPowerLevel);
        }

        if (peripheral.advertisement.localName == "iSensor ") {
          decodare(peripheral);
        }
        console.log();
      }
      else if (peripheral.advertisement.manufacturerData.toString("hex").indexOf("00005") == 0) {
        if (peripheral.advertisement.manufacturerData.toString("hex").indexOf("000057463a") == 0) {
          if (Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length > 5) {
            wifiOpenHabSsid = Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(5, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length)
          }
        }
        else if (peripheral.advertisement.manufacturerData.toString("hex").indexOf("00005746433a") == 0) {
          if (Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length > 6) {
            if (!wifiOpenHabSsid.includes(Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(6, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length))) {
              wifiOpenHabSsid = wifiOpenHabSsid + Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(6, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length)
            }
          }
        }
        else if (peripheral.advertisement.manufacturerData.toString("hex").indexOf("000050573a") == 0) {
          if (Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length > 5) {
            wifiOpenHabPwd = Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(5, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length)
          }
        }
        else if (peripheral.advertisement.manufacturerData.toString("hex").indexOf("00005057433a") == 0) {
          if (Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length > 6) {
            if (!wifiOpenHabPwd.includes(Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(6, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length))) {
              wifiOpenHabPwd = wifiOpenHabPwd + Buffer(peripheral.advertisement.manufacturerData, "hex").toString().substring(6, Buffer(peripheral.advertisement.manufacturerData, "hex").toString().length)
            }
          }
        }

        if (wifiOpenHabSsid != undefined && wifiOpenHabPwd != undefined) {
          console.log(wifiOpenHabSsid)
          console.log(wifiOpenHabPwd)

          var wifiCredentials = '# config generated by OpenHABian first boot setup \r\n' +
            'country=RO \r\n' +
            'ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev \r\n' +
            'update_config=1 \r\n' +
            'network={ \r\n' +
            'ssid="' + wifiOpenHabSsid + '" \r\n' +
            'psk="' + wifiOpenHabPwd + '" \r\n' +
            '}';

          fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', wifiCredentials, function (err, wifiCredentials) {
            if (err) console.log(err);
          })

          startAdvertising()
          setTimeout(stopAdvertising, 6500)

          if (!wifiReset) {
            wifiReset = true
            
            cmd.get(
              'sudo reboot',
              function (err, data, stderr) {
                console.log('Command data:', data)
                console.log('Command error: ', err)
                console.log('Command stderr: ', stderr)
              }
            );
          }
        }

        console.log();
      }
    }
  });
}

function startAdvertising() {
  var name = 'bHome';
  var serviceUuids = ['fb02af8af01411e981b42a2ae2dbcce4'];
  console.log(bleno.state)
  bleno.startAdvertising(name, serviceUuids, function (error) {
    console.log("AJUNGE start")
    if (error) console.log(error);
  });
}

function stopAdvertising() {
  bleno.stopAdvertising(function (error) {
    console.log("AJUNGE stop")
    if (error) console.log(error);
  });
  wifiReset = false;
}

function decodare(peripheral) {
  var manufacturerData = JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex'));
  var sensorType = manufacturerData[9] + manufacturerData[10];
  var sensorTypeBin = hexToBinary(sensorType);

  if (sensorTypeBin[3] == 0) {
    var sensorType = manufacturerData[10];
  }
  else if (sensorType[3] == 1) {
    var sensorType = sensorType;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // IR Fence
  if (sensorType == 1) {
    console.log("IR Fence");
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // PIR Detector
  else if (sensorType == 2) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = ""
    var dataStringReset = 'NO MOTION DETECTED;'
    console.log("PIR Detector")

    if (dataSentBin[6] == 1) {
      dataString = dataString + 'MOTION DETECTED;';
      console.log("PIR Motion");
    }
    else {
      dataString = dataString + 'NO MOTION DETECTED;';
      console.log("PIR No Motion");
    }
    if (dataSentBin[5] == 1) {
      dataString = dataString + 'BATTERY LOW;';
      dataStringReset = dataStringReset + 'BATTERY LOW;'
      console.log("PIR Sensor Low Battery");
    }
    else {
      dataString = dataString + 'BATTERY NORMAL;';
      dataStringReset = dataStringReset + 'BATTERY NORMAL;'
      console.log("PIR Sensor Normal Battery");
    }
    if (dataSentBin[7] == 1) {
      dataString = dataString + 'SENSOR TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR TAMPERED'
      console.log("PIR Sensor Tempered");
    }
    else {
      dataString = dataString + 'SENSOR NOT TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR NOT TAMPERED'
      console.log("PIR Not Tempered");
    }
    sendData(dataString, peripheral);
    setTimeout(sendData, 30000, dataStringReset, peripheral)
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Natural Gas Detector
  else if (sensorType == 3) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = ""
    var dataStringReset = "NO GAS DETECTED;"
    console.log("Gas Detector")

    if (dataSentBin[6] == 1) {
      dataString = dataString + 'GAS DETECTED;';
      console.log("Gas Detected");
    }
    else {
      dataString = dataString + 'NO GAS DETECTED;';
      console.log("No Gas");
    }
    if (dataSentBin[5] == 1) {
      dataString = dataString + 'BATTERY LOW;';
      dataStringReset = dataStringReset + 'BATTERY LOW;';
      console.log("Gas Sensor Low Battery");
    }
    else {
      dataString = dataString + 'BATTERY NORMAL;';
      dataStringReset = dataStringReset + 'BATTERY NORMAL;';
      console.log("Gas Sensor Normal Battery");
    }
    if (dataSentBin[7] == 1) {
      dataString = dataString + 'SENSOR TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR TAMPERED';

      console.log("Gas Sensor Tempered");
    }
    else {
      dataString = dataString + 'SENSOR NOT TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR NOT TAMPERED';

      console.log("Gas Not Tempered");
    }
    sendData(dataString, peripheral);
    setTimeout(sendData, 30000, dataStringReset, peripheral)
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Panic Button
  else if (sensorType == 4) {
    console.log("Panic Button");
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Smoke Detector
  else if (sensorType == 5) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = ""
    var dataStringReset = "NO SMOKE DETECTED;"
    console.log("Smoke Detector")
    if (dataSentBin[6] == 1) {
      dataString = dataS + 'SMOKE DETECTED;';
      console.log("Smoke Detected");
    }
    else {
      dataString = dataString + 'NO SMOKE DETECTED;';
      console.log("No Smoke");
    }
    if (dataSentBin[5] == 1) {
      dataString = dataString + 'Battery LOW;';
      dataStringReset = dataStringReset + 'Battery LOW;';

      console.log("Smoke Sensor Low Battery");
    }
    else {
      dataString = dataString + 'BATTERY NORMAL;';
      dataStringReset = dataStringReset + 'BATTERY NORMAL;';

      console.log("Smoke Sensor Normal Battery");
    }
    if (dataSentBin[7] == 1) {
      dataString = dataString + 'SENSOR TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR TAMPERED';

      console.log("Smoke Sensor Tempered");
    }
    else {
      dataString = dataString + 'SENSOR NOT TAMPERED';
      dataStringReset = dataStringReset + 'SENSOR NOT TAMPERED';

      console.log("Smoke Not Tempered");
    }
    sendData(dataString, peripheral);
    setTimeout(sendData, 30000, dataStringReset, peripheral)
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Door Sensor
  else if (sensorType == 6) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = ""
    console.log("Door Sensor");
    if (dataSentBin[6] == 1) {
      console.log("Door Sensor Opened");
      dataString = dataString + 'OPENED;';
    }
    else {
      console.log("Door Sensor Closed");
      dataString = dataString + 'CLOSED;';
    }
    if (dataSentBin[5] == 1) {
      console.log("Door Sensor Low Battery");
      dataString = dataString + 'BATTERY LOW;';
    }
    else {
      console.log("Door Sensor Normal Battery");
      dataString = dataString + 'BATTERY NORMAL;';
    }
    if (dataSentBin[7] == 1) {
      dataString = dataString + 'SENSOR TAMPERED';
      console.log("Door Sensor Tempered");
    }
    else {
      dataString = dataString + 'SENSOR NOT TAMPERED';
      console.log("Door Sensor not Tempered");
    }
    if (dataSentBin[4] == 1) {
      console.log("Door Sensor Status Report");
    }
    sendData(dataString, peripheral);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Glass Break Sensor
  else if (sensorType == 7) {
    console.log("Glass Break Sensor");
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Vibration sensor
  else if (sensorType == 8) {
    console.log("Vibration Sensor");
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Water Sensor
  else if (sensorType == 9) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = ""

    console.log("Water Sensor");
    if (dataSentBin[6] == 1) {
      dataString = dataString + 'WATER LEAK;';
      console.log("Water Sensor Leak");
    }
    else {
      dataString = dataString + 'WATER NO LEAK;';
      console.log("Water Sensor noLeak");
    }
    if (dataSentBin[5] == 1) {
      dataString = dataString + 'BATTERY LOW;';
      console.log("Water Sensor Low Battery");
    }
    else {
      var dataString = dataString + 'BATTERY NORMAL;';
      console.log("Water Sensor Normal Battery");
    }
    if (dataSentBin[7] == 1) {
      dataString = dataString + 'SENSOR TAMPERED';
      console.log("Water Sensor Tempered");
    }
    else {
      dataString = dataString + 'SENSOR NOT TAMPERED';
      console.log("Water Sensor Not Tempered");
    }
    if (dataSentBin[4] == 1) {
      console.log("Water Sensor Status Report");
    }
    sendData(dataString, peripheral);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Temp & Hum Sensor
  else if (sensorType == "c") {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);
    var dataString = "";

    console.log("Temperature Sensor");

    var tempInt = manufacturerData[17] + manufacturerData[18];
    tempInt = parseInt(tempInt, 16);

    var tempDec = manufacturerData[19] + manufacturerData[20];
    tempDec = parseInt(tempInt, 16);

    var humInt = manufacturerData[21] + manufacturerData[22];
    humInt = parseInt(humInt, 16);

    var humDec = manufacturerData[23] + manufacturerData[24];
    humDec = parseInt(humDec, 16);

    dataString = dataString + tempInt + '.' + tempDec + '/' + humInt + '.' + humDec + ';';

    if (dataSentBin[5] == 1) {
      console.log("Temp & Hum Sensor Low Battery");
      var dataString = dataString + 'BATTERY LOW;';
    }
    else {
      console.log("Temp & Hum Sensor Normal Battery");
      var dataString = dataString + 'BATTERY NORMAL;';
    }
    if (dataSentBin[7] == 1) {
      var dataString = dataString + 'SENSOR TAMPERED';
      console.log("Temp & Hum Sensor Tempered");
    }
    else {
      var dataString = dataString + 'SENSOR NOT TAMPERED';
      console.log("Temp & Hum Sensor not Tempered");
    }
    console.log("Temperature: " + tempInt + "." + tempDec);
    console.log("Humidity: " + humInt + "." + humDec + "%");
    sendData(dataString, peripheral);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Remote Control
  else if (sensorType.length == 2 && sensorType[1] == 9) {
    var dataSent = manufacturerData[11] + manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);

    console.log("Remote Key");
    if (dataSentBin[7] == 1) {
      dataString = 'Remote Key Disarm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Disarm");
    }
    if (dataSentBin[6] == 1) {
      dataString = 'Remote Key Arm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Arm");
    }
    if (dataSentBin[5] == 1) {
      dataString = 'Remote Key Home Arm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Home Arm");
    }
    if (dataSentBin[4] == 1) {
      dataString = 'Remote Key SOS';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key SOS");
    }
  }
}

function sendData(dataString, peripheral) {

  var options = {
    url: 'http://bhome:8080/rest/items/' + peripheral.id + '/state',
    method: 'PUT',
    headers: headers,
    body: dataString
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    }
  }

  request(options, callback);
}
