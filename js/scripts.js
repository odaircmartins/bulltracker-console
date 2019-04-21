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
var map = L.map('mapid').setView([51.505, -0.09], 13)
var marker
var firstTimestamp
var polyPoints = []

var myIcon = L.icon({
  iconUrl: './img/bull.png',
  iconSize: [30, 30],
  iconAnchor: [0, 0],
  popupAnchor: [15, -3]
})

var drawnItems = new L.FeatureGroup()

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
map.addControl(drawControl)

map.on(L.Draw.Event.CREATED, function (e) {
  var type = e.layerType
  var layer = e.layer
  
  for (let i = 0; i < layer._latlngs[0].length; i++) {
    coordinate =  {"lat": layer._latlngs[0][i].lat, "lng": layer._latlngs[0][i].lng}
    polyPoints.push(coordinate)
  }

  drawnItems.addLayer(layer);
})

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
const dbRef = firebase.database().ref()
const usersRef = dbRef.child('bulls')
const makerUI = document.getElementById("maker")

// Observa o banco de dados e atualiza lista de usuários a cada registro inserido
usersRef.on("child_added", snap =>{
  addMaker(snap.key, snap.val().name, snap.val().latitude, snap.val().longitude, snap.val().timestamp)
})

function addMaker(key, name, latitude, longitude, timestamp){  
  firstTimestamp = timestamp
  marker = L.marker([latitude, longitude], {icon: myIcon}).addTo(map).bindPopup("Olá! Eu sou o boi <b>" + name + " </b>. <br><br> Latitude <b>" + latitude + "</b> e Longitude <b>" + longitude + "</b>.")
}

// Observa o banco de dados e atualiza lista de usuários a cada registro alterado
usersRef.on("child_changed", snap =>{
  updateMaker(snap.key, snap.val().name, snap.val().latitude, snap.val().longitude, snap.val().timestamp)
})

function updateMaker(key, name, latitude, longitude, timestamp){ 
  timestampDiff = timestamp - firstTimestamp
  if(timestampDiff > 3000){ // Atualiza a posição a cada 10 segundos
    var lat = (latitude)
    var lng = (longitude)
    var newLatLng = new L.LatLng(lat, lng)
    marker.setLatLng(newLatLng)
    marker.bindPopup("Olá! Eu sou o boi <b>" + name + " </b>. <br><br> Latitude <b>" + latitude + "</b> e Longitude <b>" + longitude + "</b>.")
    firstTimestamp = timestamp  
    console.log(polyPoints)

    if(!pointInPolygon()){
      document.getElementById("alerta").innerHTML = "Alerta! O boi <strong>" + name + "</strong> saiu do perímetro controlado."
      document.getElementById("alerta").style.display = "block"
    } else {
      document.getElementById("alerta").innerHTML = ""
      document.getElementById("alerta").style.display = "none"
    }
  }
}

// Observa o banco de dados e atualiza lista de usuários a cada registro excluido
usersRef.on("child_removed", snap =>{
  deleteMaker(snap.key)
})

function deleteMaker(key){
  map.removeLayer(marker)
  document.getElementById("alerta").innerHTML = ""
  document.getElementById("alerta").style.display = "none"
}

function pointInPolygon(){
  if (polyPoints.length > 0){
    var x = marker._latlng.lat, y = marker._latlng.lng;
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

    if (intersections % 2 != 0) {
      return true
    } else {
      return false
    }
  } else {
    return true
  }
}

// Calcular diferença entre as coordenadas http://academicosdoexcel.com.br/2017/10/01/distancia-entre-locais-latitude-e-longitude/
