// Inicializando o Firebase
var config = {
  apiKey: "AIzaSyC4uAyFSzeGavlJWpLL533fZzm9oBv5AeY",
  authDomain: "bulltracker-7ae25.firebaseapp.com",
  databaseURL: "https://bulltracker-7ae25.firebaseio.com",
  projectId: "bulltracker-7ae25",
  storageBucket: "bulltracker-7ae25.appspot.com",
  messagingSenderId: "824064087917"
}

firebase.initializeApp(config)

// Inicializando o map leaflet.js
var map = L.map('mapid').setView([51.505, -0.09], 13);
var marker = [];
var markerGenerated;
var firstTimestamp;
var polyPoints = [];

let siren = document.querySelector("#siren");
let gerarBois = document.querySelector("#gerarBois");
let boisNaCercaMsg = document.querySelector('#boisNaCerca');
let botaoGerarBois;

var myIcon = L.icon({
  iconUrl: './img/bull.png',
  iconSize: [30, 30],
  iconAnchor: [0, 0],
  popupAnchor: [15, -3]
});

var myIcon2 = L.icon({
  iconUrl: './img/bull-generated.png',
  iconSize: [30, 30],
  iconAnchor: [0, 0],
  popupAnchor: [15, -3]
});

var gerarBoisEstaAtivado = false;

var drawnItems = new L.FeatureGroup();

map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  draw: {
    marker: false,
    polyline: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems
  }
})

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
  var type = e.layerType
  var layer = e.layer
  
  for (let i = 0; i < layer._latlngs[0].length; i++) {
    coordinate =  {"lat": layer._latlngs[0][i].lat, "lng": layer._latlngs[0][i].lng};
    polyPoints.push(coordinate);
  }

  drawnItems.addLayer(layer);
});

map.on('draw:deleted', function (evt) {
  layer = evt.layer;
  polyPoints = []
});

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoib2RhaXJjbWFydGlucyIsImEiOiJjanVwZ3FwcjczYWh5M3ludjdpczcwbTZ2In0.FmdhJJBe4uYcj9UNWEic_g'
}).addTo(map);

map.locate({setView: true, maxZoom: 16});

// Cria a referência com o nó a ser manipulado no Firebase
const dbRef = firebase.database().ref();
const usersRef = dbRef.child('bulls');
const makerUI = document.getElementById("maker");

function getRandonInteger(min, max) {
  return Math.random() * (max - min);
}

function ehPar(numero){
  let resto = numero % 2;
  return resto > 0 ? false : true;
}

usersRef.on("child_added", snap =>{
  addMaker(snap.key, snap.val().name, snap.val().latitude, snap.val().longitude, snap.val().timestamp, snap.val().anotacoes);
  botaoGerarBois = document.createElement('a');
  botaoGerarBois.classList.add('button');
  botaoGerarBois.classList.add('is-info');
  botaoGerarBois.text = 'Gerar bois';
  gerarBois.append(botaoGerarBois);
})

function generateBulls(latitude, longitude, timestamp){
  let boisGerados = Math.floor(Math.random() * 10) + 4; //Gera de 5 a 10 bois na tela;

  for (let i = 1; i <= boisGerados; i++) {
    let variacao1 = getRandonInteger(0.0050000, 0.0070000);
    let variacao2 = getRandonInteger(0.0050000, 0.0070000);

    if (ehPar(i)){
      variacao1 = variacao1 * -1;
      variacao2 = variacao2 * -1;
    }
    
    let newLatitude = latitude + variacao1;
    let newLongitude = longitude + variacao2;
    addMakerGenerated('Boi ' + i + ' - Gerado automaticamente', newLatitude, newLongitude);
  }
}

function addMaker(key, name, latitude, longitude, timestamp, anotacoes){  
  firstTimestamp = timestamp
  marker.push(L.marker([latitude, longitude], {icon: myIcon}).addTo(map)
    .bindPopup("Boi <b>" + name + 
               " </b>. <br><br> Latitude <b>" + latitude + 
              "</b> e Longitude <b>" + longitude + 
              "</b>. <br><br> Anotações <b>" + anotacoes));
}

function addMakerGenerated(name, latitude, longitude){  
  marker.push(L.marker([latitude, longitude], {icon: myIcon2}).addTo(map).bindPopup("Olá! Eu sou o boi <b>" + name + " </b>. <br><br> Latitude <b>" + latitude + "</b> e Longitude <b>" + longitude + "</b>."));
}

usersRef.on("child_changed", snap =>{
  updateMaker(snap.key, snap.val().name, snap.val().latitude, snap.val().longitude, snap.val().timestamp, snap.val().coleiraRompida, snap.val().anotacoes);
  if(!gerarBoisEstaAtivado){
    gerarBoisEstaAtivado = true;
    botaoGerarBois.addEventListener('click', () => {
      generateBulls(snap.val().latitude, snap.val().longitude);
    });  
  }
});

function updateMaker(key, name, latitude, longitude, timestamp, coleiraRompida, anotacoes){ 
  timestampDiff = timestamp - firstTimestamp
  if(timestampDiff > 600){ // Atualiza a posição a cada 3 segundos    
    var lat = (latitude);
    var lng = (longitude);
    var newLatLng = new L.LatLng(lat, lng);
    marker[0].setLatLng(newLatLng);
    marker[0].bindPopup("Boi <b>" + name + 
                        " </b>. <br><br> Latitude <b>" + latitude + 
                        "</b> e Longitude <b>" + longitude + 
                        "</b>. <br><br> Anotações <b>" + anotacoes);
    firstTimestamp = timestamp;  

    if(pointInPolygon() || coleiraRompida){
      acionarSirene(true);  
      
      if(coleiraRompida){
        document.getElementById("alerta").innerHTML = "Alerta! A coleira do boi "  + name + " rompeu.";
      } else {
        document.getElementById("alerta").innerHTML = "Alerta! Um boi saiu do perímetro controlado.";
      }

      document.getElementById("alerta").style.display = "block";
    } else {
      acionarSirene(false);
      document.getElementById("alerta").innerHTML = "";
      document.getElementById("alerta").style.display = "none";
    }
  }
}

function acionarSirene(status){
  if (status){
    siren.currentTime = 0;
    siren.play();
  } else {
    siren.pause();
  }
}

// Observa o banco de dados e atualiza lista de usuários a cada registro excluido
usersRef.on("child_removed", snap =>{
  deleteMaker(snap.key);
  gerarBois.removeChild(botaoGerarBois);
})

function deleteMaker(key){
  map.removeLayer(marker[0]);
  document.getElementById("alerta").innerHTML = "";
  document.getElementById("alerta").style.display = "none";
}

var boisNacerca = 0;

function pointInPolygon(){
  let temBoiForaDaCerca = false;
  boisNacerca = 0;

  for (let k = 0; k < marker.length; k++) {
    if (polyPoints.length > 0){      
      var x = marker[k]._latlng.lat, y = marker[k]._latlng.lng;
      var inside = false;
      var intersections = 0;
      var ss = "";
  
      for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
        var xi = polyPoints[i].lat, yi = polyPoints[i].lng; var xj = polyPoints[j].lat, yj = polyPoints[j].lng;
        
        if (yj == yi && yj == y && x > Math.min(xj, xi) && x < Math.max(xj, xi)) { // Check if point is on an horizontal polygon boundary
          return true
        }
  
        if (y > Math.min(yj, yi) && y <= Math.max(yj, yi) && x <= Math.max(xj, xi) && yj != yi) {
          ss = (y - yj) * (xi - xj) / (yi - yj) + xj
          if (ss == x) { // Check if point is on the polygon boundary (other than horizontal)
            return true
          }
  
          if (xj == xi || x <= ss) {
            intersections++; 
          } 
        } 
      }
      
      // If the number of edges we passed through is odd, then it’s in the polygon.
  
      if (intersections % 2 == 0) {        
        temBoiForaDaCerca = true;
      } else {
        boisNacerca++;
      }
    }
  }
  
  boisNaCercaMsg.innerText = "Bois na área demarcada: " + boisNacerca;

  return temBoiForaDaCerca;
}

// Calcular diferença entre as coordenadas http://academicosdoexcel.com.br/2017/10/01/distancia-entre-locais-latitude-e-longitude/
