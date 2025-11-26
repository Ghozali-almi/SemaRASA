// assets/js/map.js
import { PlacesAPI } from './api.js';

// ===== Peta & state global =====
const map = L.map('map').setView([-6.9932, 110.4203], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

setTimeout(() => map.invalidateSize(), 200);
window.addEventListener('resize', () => map.invalidateSize());

let places = [];
let markers = {};
let selectedLatLng = null;
let radiusCircle = null;
let radiusCenter = null;
let centerMarker = null;

const activeCategories = new Set(['Street Food', 'Resto', 'Oleh-oleh']);

// ===== DOM elements =====
const placeList = document.getElementById('placeList');
const radiusSlider = document.getElementById('radiusSlider');
const radiusValue = document.getElementById('radiusValue');
const applyRadiusBtn = document.getElementById('applyRadius');
const clearRadiusBtn = document.getElementById('clearRadius');
const useMyLocationBtn = document.getElementById('useMyLocation');

const totalPlacesEl = document.getElementById('totalPlaces');
const visiblePlacesEl = document.getElementById('visiblePlaces');
const inRadiusEl = document.getElementById('inRadius');
const placeCountEl = document.getElementById('placeCount');

// ===== Utilitas =====
// Hitung jarak antara dua koordinat (km) menggunakan rumus Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function getCategoryClass(category) {
  if (category === 'Street Food') return 'cat-street-food';
  if (category === 'Resto') return 'cat-resto';
  return 'cat-oleh-oleh';
}

function createMarkerIcon(category) {
  let color = '#3b82f6';
  if (category === 'Street Food') color = '#eab308';
  if (category === 'Resto') color = '#3b82f6';
  if (category === 'Oleh-oleh') color = '#ec4899';

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
}

// ===== Marker & popup =====
function createOrUpdateMarker(place) {
  let marker = markers[place.id];

  if (!marker) {
    marker = L.marker([place.lat, place.lng], {
      icon: createMarkerIcon(place.category)
    }).addTo(map);

    markers[place.id] = marker;

    marker.on('click', () => highlightPlaceInList(place.id));
  } else {
    marker.setLatLng([place.lat, place.lng]);
    marker.setIcon(createMarkerIcon(place.category));
  }

  updateMarkerPopup(place);
  applyMarkerVisibility(place);
}

function updateMarkerPopup(place) {
  const marker = markers[place.id];
  if (!marker) return;

  const photo = place.photo
    ? `<img src="${place.photo}" class="popup-image" onerror="this.style.display='none'">`
    : '';

  // Deskripsi dengan toggle Selengkapnya
  const fullDesc = (place.description || '').trim();
  const limit = 80;
  const isLong = fullDesc.length > limit;
  const shortDesc = isLong ? fullDesc.slice(0, limit) + '…' : fullDesc;
  const descHtml = fullDesc
    ? `<div class="popup-desc">
         <span class="desc-short">${shortDesc}</span>
         <span class="desc-full" style="display:none;">${fullDesc}</span>
         ${isLong ? `<button class="popup-readmore" style="background:none;border:none;color:#2563eb;cursor:pointer;padding:0;margin-top:6px;text-decoration:underline;">Selengkapnya</button>` : ''}
       </div><br>`
    : '';

  const menu = place.menu ? `<strong>Menu:</strong> ${place.menu}<br>` : '';
  const price = place.price ? `<strong>Harga:</strong> ${place.price}<br>` : '';
  const address = place.address ? `<strong>Alamat:</strong> ${place.address}<br>` : '';
  const hours = place.hours ? `<strong>Jam Buka:</strong> ${place.hours}<br>` : '';

  const googleMapsUrl = place.url_gmaps
    ? place.url_gmaps
    : `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  const html = `
    <div class="custom-popup">
      ${photo}
      <div class="popup-title">${place.name}</div>
      <span class="popup-category ${getCategoryClass(place.category)}">${place.category}</span>
      <div class="popup-info">
        ${descHtml}
        ${menu}
        ${price}
        ${address}
        ${hours}
      </div>
      <div class="popup-buttons">
        <a href="${googleMapsUrl}" target="_blank" class="btn btn-secondary btn-small" style="text-decoration:none;">Google Maps</a>
      </div>
    </div>
  `;

  marker.bindPopup(html, { maxWidth: 300 });

  // Pasang handler toggle pada saat popup dibuka
  marker.off('popupopen');
  marker.on('popupopen', e => {
    const popupEl = e.popup.getElement();
    if (!popupEl) return;
    const readMoreBtn = popupEl.querySelector('.popup-readmore');
    const shortSpan = popupEl.querySelector('.desc-short');
    const fullSpan = popupEl.querySelector('.desc-full');
    if (!readMoreBtn || !shortSpan || !fullSpan) return;

    let expanded = false;
    readMoreBtn.addEventListener('click', () => {
      expanded = !expanded;
      shortSpan.style.display = expanded ? 'none' : '';
      fullSpan.style.display = expanded ? '' : 'none';
      readMoreBtn.textContent = expanded ? 'Tutup' : 'Selengkapnya';
    });
  });
}

function applyMarkerVisibility(place) {
  const marker = markers[place.id];
  if (!marker) return;

  let isVisible = activeCategories.has(place.category);

  if (isVisible && radiusCircle && radiusCenter && radiusSlider) {
    const radiusKm = parseFloat(radiusSlider.value);
    const distance = calculateDistance(
      radiusCenter.lat,
      radiusCenter.lng,
      place.lat,
      place.lng
    );
    if (distance > radiusKm) isVisible = false;
  }

  if (isVisible) {
    if (!map.hasLayer(marker)) marker.addTo(map);
  } else {
    if (map.hasLayer(marker)) map.removeLayer(marker);
  }
}

// ===== Sidebar list =====
// Render daftar lokasi di sidebar sesuai filter dan urutan (jarak atau nama)
function renderPlaceList() {
  if (!placeList) return;
  placeList.innerHTML = '';

  let filtered = places.filter(p => activeCategories.has(p.category));

  if (radiusCircle && radiusCenter && radiusSlider) {
    const radiusKm = parseFloat(radiusSlider.value);
    filtered = filtered
      .filter(p => calculateDistance(radiusCenter.lat, radiusCenter.lng, p.lat, p.lng) <= radiusKm)
      .sort(
        (a, b) =>
          calculateDistance(radiusCenter.lat, radiusCenter.lng, a.lat, a.lng) -
          calculateDistance(radiusCenter.lat, radiusCenter.lng, b.lat, b.lng)
      );
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (!filtered.length) {
    placeList.innerHTML =
      '<div class="empty-state">Tidak ada lokasi yang sesuai dengan filter</div>';
    if (placeCountEl) placeCountEl.textContent = 0;
    return;
  }

  filtered.forEach(place => {
    const item = document.createElement('div');
    item.className = 'place-item';
    item.dataset.placeId = place.id;

    let distanceText = '';
    if (radiusCenter && radiusSlider) {
      const distance = calculateDistance(radiusCenter.lat, radiusCenter.lng, place.lat, place.lng);
      distanceText = `<span class="place-item-distance">📍 ${formatDistance(distance)}</span>`;
    }

    const desc = place.description
      ? `<div class="place-item-desc">${place.description}</div>`
      : '';

    const info = [];
    if (place.menu) info.push(`Menu: ${place.menu}`);
    if (place.price) info.push(place.price);
    if (place.hours) info.push(`⏰ ${place.hours}`);

    const infoHtml = info.length
      ? `<div class="place-item-info">${info.join(' • ')}</div>`
      : '';

    item.innerHTML = `
      <div class="place-item-header">
        <div class="place-item-name">${place.name}</div>
        ${distanceText}
      </div>
      <span class="place-item-category ${getCategoryClass(place.category)}">${place.category}</span>
      ${desc}
      ${infoHtml}
    `;

    item.addEventListener('click', () => focusPlace(place.id));
    placeList.appendChild(item);
  });

  if (placeCountEl) placeCountEl.textContent = filtered.length;
}

// Sorot item daftar berdasarkan id lokasi dan gulir jika perlu
function highlightPlaceInList(placeId) {
  if (!placeList) return;
  document.querySelectorAll('.place-item').forEach(item => {
    item.style.borderColor = '#e5e7eb';
  });
  const item = document.querySelector(`.place-item[data-place-id="${placeId}"]`);
  if (item) {
    item.style.borderColor = '#2563eb';
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Fokus peta ke lokasi dengan memperbesar zoom dan membuka popup
function focusPlace(id) {
  const place = places.find(p => p.id == id);
  const marker = markers[id];
  if (!place || !marker) return;

  map.setView([place.lat, place.lng], 17, { animate: true });
  marker.openPopup();
  highlightPlaceInList(id);
}

// ===== Statistik =====
// Perbarui statistik total, jumlah terlihat, per kategori, dan dalam radius
function updateStats() {
  if (totalPlacesEl) totalPlacesEl.textContent = places.length;

  const visibleCount = places.filter(p => activeCategories.has(p.category)).length;
  if (visiblePlacesEl) visiblePlacesEl.textContent = visibleCount;

  const categoryCounts = { 'Street Food': 0, Resto: 0, 'Oleh-oleh': 0 };
  places.forEach(place => {
    if (categoryCounts.hasOwnProperty(place.category)) {
      categoryCounts[place.category]++;
    }
  });

  document.querySelectorAll('.count').forEach(el => {
    const category = el.dataset.category;
    el.textContent = categoryCounts[category] || 0;
  });

  if (inRadiusEl && radiusCircle && radiusCenter && radiusSlider) {
    const radiusKm = parseFloat(radiusSlider.value);
    const inRadiusCount = places.filter(p => {
      if (!activeCategories.has(p.category)) return false;
      const d = calculateDistance(radiusCenter.lat, radiusCenter.lng, p.lat, p.lng);
      return d <= radiusKm;
    }).length;
    inRadiusEl.textContent = inRadiusCount;
  } else if (inRadiusEl) {
    inRadiusEl.textContent = '-';
  }
}

// ===== Filter kategori =====
// Pasang event listener pada checkbox kategori untuk memperbarui tampilan
document
  .querySelectorAll('.checkbox-item input[type="checkbox"]')
  .forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const category = e.target.value;
      if (e.target.checked) {
        activeCategories.add(category);
      } else {
        activeCategories.delete(category);
      }
      places.forEach(applyMarkerVisibility);
      renderPlaceList();
      updateStats();
    });
  });

// ===== Radius slider =====
// Tampilkan nilai radius saat slider digeser
if (radiusSlider && radiusValue) {
  radiusSlider.addEventListener('input', e => {
    radiusValue.textContent = `${e.target.value} km`;
  });
}

// ===== Tombol apply radius =====
// Terapkan pencarian radius: gambar lingkaran dan filter lokasi di dalamnya
if (applyRadiusBtn) {
  applyRadiusBtn.addEventListener('click', () => {
    if (!radiusSlider) return;
    if (!selectedLatLng && !radiusCenter) {
      alert(
        'Silakan klik pada peta atau gunakan lokasi Anda untuk menentukan titik pusat pencarian.'
      );
      return;
    }

    const center = selectedLatLng || radiusCenter;
    radiusCenter = center;
    const radiusKm = parseFloat(radiusSlider.value);

    if (radiusCircle) {
      map.removeLayer(radiusCircle);
    }

    radiusCircle = L.circle([center.lat, center.lng], {
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      radius: radiusKm * 1000
    }).addTo(map);

    map.fitBounds(radiusCircle.getBounds(), { padding: [50, 50] });

    places.forEach(applyMarkerVisibility);
    renderPlaceList();
    updateStats();
  });
}

// ===== Tombol clear radius =====
if (clearRadiusBtn) {
  clearRadiusBtn.addEventListener('click', () => {
    if (radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }
    radiusCenter = null;
    if (centerMarker) {
      map.removeLayer(centerMarker);
      centerMarker = null;
    }
    selectedLatLng = null;
    places.forEach(applyMarkerVisibility);
    renderPlaceList();
    updateStats();
  });
}

// ===== Gunakan lokasi saya =====
if (useMyLocationBtn) {
  useMyLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda.');
      return;
    }

    useMyLocationBtn.textContent = '📍 Mencari lokasi...';
    useMyLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      position => {
        selectedLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        if (centerMarker) {
          map.removeLayer(centerMarker);
        }
        centerMarker = L.marker(selectedLatLng, {
          opacity: 0.85,
          icon: L.divIcon({
            html: '📍',
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(map);

        map.setView(selectedLatLng, 15);

        useMyLocationBtn.textContent = '📍 Gunakan Lokasi Saya';
        useMyLocationBtn.disabled = false;

        alert(
          'Lokasi Anda berhasil dideteksi! Sekarang klik "Terapkan Radius" untuk mencari kuliner di sekitar Anda.'
        );
      },
      error => {
        alert('Gagal mendapatkan lokasi: ' + error.message);
        useMyLocationBtn.textContent = '📍 Gunakan Lokasi Saya';
        useMyLocationBtn.disabled = false;
      }
    );
  });
}

// ===== Klik peta (hanya untuk radius center di user mode) =====
map.on('click', e => {
  selectedLatLng = e.latlng;
  if (centerMarker) {
    map.removeLayer(centerMarker);
  }
  centerMarker = L.marker(selectedLatLng, {
    opacity: 0.85,
    icon: L.divIcon({
      html: '📍',
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }).addTo(map);
});

// ===== Inisialisasi =====
// Ambil semua lokasi dari API, buat marker, render daftar, dan update statistik
async function init() {
  try {
    const data = await PlacesAPI.getAll();
    places = data.map(p => ({
      ...p,
      lat: Number(p.lat),
      lng: Number(p.lng)
    }));

    places.forEach(createOrUpdateMarker);
    renderPlaceList();
    updateStats();
  } catch (err) {
    console.error(err);
    alert('Gagal memuat data kuliner dari server.');
  }
}

init();