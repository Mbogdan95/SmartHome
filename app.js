var noble = require("@abandonware/noble");
var fs = require("fs");
var hexToBinary = require("hex-to-binary");
var request = require('request');
var Fuse = require('fuse.js');

var groupNamesArray = [];
var headers = {
  'Content-Type': 'text/plain',
  'Accept': 'application/json'
};

/*
var whitelist = fs.readFileSync('whitelist.txt').toString().split("\n");
for (var i in whitelist){
    whitelist[i] = whitelist[i].replace("\r", "");
}
*/
setTimeout(SiteMapRequest, 60000);
//SiteMapRequest();

function SiteMapRequest(){
  var options = {
    url: 'http://openhabianpi:8080/rest/items?recursive=false',
    headers: headers
  };
  
  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      sitemapCreation(JSON.parse(body))
    }
  }
  
  request(options, callback);
}

function sitemapCreation(body){
  var sitemapData = 'sitemap ble label="Your Smart Home" {\r\n'

  var options = {
    keys: ['link'],
    id: 'groupNames'
  };

  var fuse = new Fuse(body, options)
  
  var result = fuse.search('openhabian')
  result.forEach(element => {
    if (element != null){
      if (groupNamesArray.indexOf(element) == -1){
        groupNamesArray.push(element);
      }
    }
  });


  var groupNull = body.filter(o => o.groupNames.length === 0);
  if (groupNull !== []){
    sitemapData = sitemapData + 'Frame label="Smart Sensors" {\r\n'
    groupNull = groupNull.filter(o => o.type !== "Group");
    groupNull.forEach(element =>{
      if (element.type == 'String'){
        if (element.category == 'temperature'){
          sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + ' [%s °C]"\r\n';
        }
        else{
          sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + ' [%s]"\r\n';
        }
      }
      else{
        sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + '"\r\n';
      }
    })
    sitemapData = sitemapData + "}\r\n";
  }
  groupNamesArray.forEach(element =>{
    sitemapData = sitemapData + 'Frame label="' + element + '" {\r\n';

    var groupArray = body.filter(o => o.groupNames.indexOf(element) === 0)
    groupArray.forEach(element => {
      if (element.type == 'String'){
        if (element.category == 'temperature'){
          sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + ' [%s °C]"\r\n';
        }
        else{
          sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + ' [%s]"\r\n';
        }
      }
      else{
        sitemapData = sitemapData + 'Default item=' + element.name + ' label="' + element.label + '"\r\n';
      }
    })
    sitemapData = sitemapData + "}\r\n";

  })
  sitemapData = sitemapData + "}\r\n";

  fs.writeFile("/etc/openhab2/sitemaps/ble.sitemap", sitemapData, function(err, sitemapData) {
    if (err) console.log(err);
  })
  BleScan();
}

function BleScan(){
  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      noble.startScanning([], true);
    } else {
      noble.stopScanning();
    }
  });
  
  noble.on('discover', function(peripheral) {
      //if (whitelist.indexOf(peripheral.id) !== -1){
      if (peripheral.advertisement.localName == "iSensor "){
      //if (peripheral.id == 'e005cb3329e8'){
    console.log('peripheral discovered (' + peripheral.id +
                ' with address <' + peripheral.address +  ', ' + peripheral.addressType + '>,' +
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
    }
    if (peripheral.advertisement.txPowerLevel !== undefined) {
      console.log('\tmy TX power level is:');
      console.log('\t\t' + peripheral.advertisement.txPowerLevel);
    }
    decodare(peripheral);
    console.log();
      }
  });  
}

function decodare(peripheral){
	var manufacturerData = JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex'));
  var sensorType = manufacturerData[9] + manufacturerData[10];
  var sensorTypeBin = hexToBinary(sensorType);

  if (sensorTypeBin[3] == 0){
    var sensorType = manufacturerData[10];
  }
  else if (sensorType[3] == 1){
    var sensorType = sensorType;
  } 

  if (sensorType == 1){
    console.log("IR Fence");
  }
  else if (sensorType == 2){
    var dataSent = manufacturerData[11]+manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);

    console.log("PIR Detector")
    if (dataSentBin[7] == 1){
      var dataString = 'Sensor Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("PIR Sensor Tempered");
    }
    else{
      var dataString = 'Sensor Not Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("PIR  Not Tempered");
    }
    if (dataSentBin[6] == 1){
      var dataString = 'Motion Detected';
      var type = '_pir';
      sendData(dataString, peripheral, type);
      console.log("PIR Motion");
    }
    else{
      var dataString = 'No Motion Detected';
      var type = '_pir';
      sendData(dataString, peripheral, type);
      console.log("PIR No Motion");
    }
    if (dataSentBin[5] == 1){
      var dataString = 'LOW BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
      console.log("PIR Sensor Low Battery");
    }
    else{
      var dataString = 'NORMAL BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
      console.log("PIR Sensor Normal Battery");
    }
  }
  else if (sensorType == 3){
    console.log("Natural Gas Detector");
  }
  else if (sensorType == 4){
    console.log("Panic Button");
  }
  else if (sensorType == 5){
    console.log("Smoke Detector")
  }
  else if (sensorType == 6){
    var dataSent = manufacturerData[11]+manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);

    console.log("Door Sensor");
    if (dataSentBin[7] == 1){
      var dataString = 'Sensor Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("Door Sensor Tempered");
    }
    else{
      var dataString = 'Sensor Not Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("Door Sensor not Tempered");
    }
    if (dataSentBin[6] == 1){
      console.log("Door Sensor Opened");
      var dataString = 'OPEN';
      var type = '_senz';
      sendData(dataString, peripheral, type);
    }
    else{
      console.log("Door Sensor Closed");
      var dataString = 'CLOSED';
      var type = '_senz'
      sendData(dataString, peripheral, type);
    }
    if (dataSentBin[5] == 1){
      console.log("Door Sensor Low Battery");
      var dataString = 'LOW BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
    }
    else{
      console.log("Door Sensor Normal Battery");
      var dataString = 'NORMAL BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
    }
    if (dataSentBin[4] == 1){
      console.log("Door Sensor Status Report");
    }
  }
  else if (sensorType == 7){
    console.log("Glass Break Sensor");
  }
  else if (sensorType == 8){
    console.log("Vibration Sensor");
  }
  else if (sensorType == 9){
    var dataSent = manufacturerData[11]+manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);

    console.log("Water Sensor");
    if (dataSentBin[7] == 1){
      var dataString = 'Sensor Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor Tempered");
    }
    else{
      var dataString = 'Sensor Not Tempered';
      var type = '_temper';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor Not Tempered");
    }
    if (dataSentBin[6] == 1){
      var dataString = 'Water Leak';
      var type = '_leak';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor Leak");
    }
    else{
      var dataString = 'No Leak';
      var type = '_leak';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor noLeak");
    }
    if (dataSentBin[5] == 1){
      var dataString = 'LOW BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor Low Battery");
    }
    else{
      var dataString = 'NORMAL BATTERY';
      var type = '_bat';
      sendData(dataString, peripheral, type);
      console.log("Water Sensor Normal Battery");
    }
    if (dataSentBin[4] == 1){
      console.log("Water Sensor Status Report");
    }
  }
  else if (sensorType == "c"){
    var tempInt = manufacturerData[17]+manufacturerData[18];
    tempInt = parseInt(tempInt, 16);

    var tempDec = manufacturerData[19]+manufacturerData[20];
    tempDec = parseInt(tempInt, 16);

    var humInt = manufacturerData[21]+manufacturerData[22];
    humInt = parseInt(humInt, 16);

    var humDec = manufacturerData[23]+manufacturerData[24];
    humDec = parseInt(humDec, 16);

    var dataString = tempInt + '.' + tempDec;
    var type= '_temp';
    sendData(dataString, peripheral, type);

    dataString = humInt + '.' + humDec;
    type = '_hum';
    sendData(dataString, peripheral, type);

    console.log("Temperature Sensor");
    console.log("Temperature: " + tempInt + "." + tempDec);
    console.log("Humidity: " + humInt + "." + humDec + "%");

  } 
  else if (sensorType.length == 2 && sensorType[1] == 9){
    var dataSent = manufacturerData[11]+manufacturerData[12];
    var dataSentBin = hexToBinary(dataSent);

    console.log("Remote Key");
    if (dataSentBin[7] == 1){
      dataString = 'Remote Key Disarm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Disarm");
    }
    if (dataSentBin[6] == 1){
      dataString = 'Remote Key Arm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Arm");
    }
    if (dataSentBin[5] == 1){
      dataString = 'Remote Key Home Arm';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key Home Arm");
    }
    if (dataSentBin[4] == 1){
      dataString = 'Remote Key SOS';
      type = '_remote';
      sendData(dataString, peripheral, type);

      console.log("Remote Key SOS");
    }
  }
}

function sendData(dataString, peripheral, type){

  var options = {
    url: 'http://openhabianpi:8080/rest/items/' + peripheral.id + type +'/state',
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