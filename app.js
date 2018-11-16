//imports
var express = require('express');
var Docker = require('dockerode');

//constants
var DOCKER_PROTOCOL = process.env.DOCKER_PROTOCOL;
var DOCKER_HOST = process.env.DOCKER_HOST;
var DOCKER_PORT = parseInt(process.env.DOCKER_PORT);

//app
var app = express();
var docker = new Docker({ protocol: DOCKER_PROTOCOL, host: DOCKER_HOST, port: DOCKER_PORT });

app.get('/get/:container', async (req, res) => {
  var containerName = req.params.container;
  try {
    var container = await getContainer(containerName);
    res.send(container.Id);
  } catch (e) {
    res.send(e);
  }
});

app.get('/list/:container', async (req, res) => {
  var containerName = req.params.container;
  var searchType = req.query.searchType;
  try {
    var containers = await getContainers(containerName, searchType);
    var containerIds = containers.map(container => container.Id);
    res.send(containerIds);
  } catch (e) {
    res.send(e);
  }
});

app.get('/listObjects/:container', async (req, res) => {
  var containerName = req.params.container;
  var searchType = req.query.searchType;
  try {
    var containers = await getContainers(containerName, searchType);
    res.send(containers);
  } catch (e) {
    res.send(e);
  }
});

app.get('/start/:container', async (req, res) => {
  var containerToStart = req.params.container;
  var searchType = req.query.searchType;
  try {
    var containerDatas = await getContainers(containerToStart, searchType);
    var msg = "";
    var startPromises = containerDatas
    .filter(containerData => containerData.State !== 'running')
    .map(containerData => {
      msg += (`Starting container ${containerData.Id}\n`);
      var container = docker.getContainer(containerData.Id);
      return startContainer(container);
    });
    await Promise.all(startPromises);
    res.send(msg);
  } catch (e) {
    res.send(e);
  }
});

app.get('/stop/:container', async (req, res) => {
  var containerToStop = req.params.container;
  var searchType = req.query.searchType;
  try {
    var containerDatas = await getContainers(containerToStop, searchType);
    var msg = "";
    var stopPromises = containerDatas
    .filter(containerData => containerData.State === 'running')
    .map(containerData => {
      msg += (`Stoping container ${containerData.Id}\n`);
      var container = docker.getContainer(containerData.Id);
      return stopContainer(container);
    });
    await Promise.all(stopPromises);
    res.send(msg);
  } catch (e) {
    res.send(e);
  }
});

app.listen(3000, '0.0.0.0');




async function getContainer(containerSearchName) {
  var containers = await getContainers(containerSearchName, 'equals');
  if(containers.length > 1) {
    throw "Error: found multiple containers.";
  } else if(containers.length === 0) {
    throw "Error: no container found.";
  } else {
    return containers[0];
  }
}

async function getContainers(containerSearchName, searchType) {
  console.log(`Found param container ${containerSearchName}.`);

  var containers = await toPromise((callback) => {
    docker.listContainers({all: true}, callback);
  });

  console.log(`Filtering found ${containers.length} containers.`);
  var filteredContainers = containers.filter(container => {
    var matchingNames = container.Names
      .map(name => name.substr(1))
      .filter(name => stringMatches(name, containerSearchName, searchType));
    return matchingNames.length > 0;
  });

  console.log(`Found ${filteredContainers.length} that match the name ${containerSearchName}`);
  return filteredContainers;
}

function stringMatches(stringToCheck, searchString, searchType) {
  if(!searchType || searchType === 'equals') {
    return stringToCheck.toLowerCase() === searchString.toLowerCase();
  } else if (searchType === 'regex') {
    var regex = new RegExp(searchString);
    return stringToCheck.match(regex);
  } else if (searchType === 'all') {
    return true;
  }
  return false;
}

async function startContainer(container) {
  return toPromise(callback => container.start(callback));
}

async function stopContainer(container) {
  return toPromise(callback => container.stop(callback));
}

async function toPromise(execFunc) {
  return new Promise((resolve, reject) => {
    execFunc((err, data) => {
      if(err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
