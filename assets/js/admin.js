// assets/js/admin.js
import { PlacesAPI } from './api.js';

// ===== MAP SETUP =====
const map = L.map('map').setView([-6.9932, 110.4203], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

setTimeout(() => map.invalidateSize(), 200);
window.addEventListener('resize', () => map.invalidateSize());

// ===== STATE =====
let places = [];
let markers = {};
let selectedLatLng = null;
let tempMarker = null;
let isEditing = false;

// ===== DOM =====
const placeForm = document.getElementById('placeForm');
const placeIdInput = document.getElementById('placeId');
const nameInput = document.getElementById('name');
const categoryInput = document.getElementById('category');
const descInput = document.getElementById('description');
const menuInput = document.getElementById('menu');
const priceInput = document.getElementById('price');
const addressInput = document.getElementById('address');
const hoursInput = document.getElementById('hours');
const photoInput = document.getElementById('photo');
const coordDisplay = document.getElementById('coordDisplay');
const placeList = document.getElementById('placeList');
const totalPlacesEl = document.getElementById('totalPlaces');
const resetBtn = document.getElementById('resetBtn');
// const loadSampleBtn = document.getElementById('loadSampleData');

// ===== UTIL =====
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

// ===== MARKER =====
function createOrUpdateMarker(place) {
  let marker = markers[place.id];

  if (!marker) {
    marker = L.marker([place.lat, place.lng], {
      icon: createMarkerIcon(place.category),
      draggable: true
    }).addTo(map);

    markers[place.id] = marker;

    marker.on('dragend', async e => {
      const { lat, lng } = e.target.getLatLng();
      place.lat = lat;
      place.lng = lng;

      try {
        await PlacesAPI.update(place);
      } catch (err) {
        console.error(err);
        alert('Gagal memperbarui posisi di server.');
      }

      updateMarkerPopup(place);
    });

    marker.on('click', () => highlightPlaceInList(place.id));
  } else {
    marker.setLatLng([place.lat, place.lng]);
    marker.setIcon(createMarkerIcon(place.category));
  }

  updateMarkerPopup(place);
}

function updateMarkerPopup(place) {
  const marker = markers[place.id];
  if (!marker) return;

  const menu = place.menu ? `<strong>Menu:</strong> ${place.menu}<br>` : '';
  const price = place.price ? `<strong>Harga:</strong> ${place.price}<br>` : '';
  const address = place.address ? `<strong>Alamat:</strong> ${place.address}<br>` : '';
  const hours = place.hours ? `<strong>Jam Buka:</strong> ${place.hours}<br>` : '';
  const desc = place.description ? `${place.description}<br><br>` : '';

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  const html = `
    <div class="custom-popup">
      <div class="popup-title">${place.name}</div>
      <span class="popup-category ${getCategoryClass(place.category)}">${place.category}</span>
      <div class="popup-info">
        ${desc}
        ${menu}
        ${price}
        ${address}
        ${hours}
      </div>
      <div class="popup-buttons">
        <button class="btn btn-primary popup-edit" data-id="${place.id}">Edit</button>
        <button class="btn btn-danger popup-delete" data-id="${place.id}">Hapus</button>
        <a href="${googleMapsUrl}" target="_blank" class="btn btn-secondary" style="text-decoration:none;">Google Maps</a>
      </div>
    </div>
  `;

  marker.bindPopup(html, { maxWidth: 260 });

  marker.off('popupopen');
  marker.on('popupopen', e => {
    const popupEl = e.popup.getElement();
    if (!popupEl) return;
    const editBtn = popupEl.querySelector('.popup-edit');
    const deleteBtn = popupEl.querySelector('.popup-delete');
    if (editBtn) editBtn.addEventListener('click', () => startEdit(place.id));
    if (deleteBtn) deleteBtn.addEventListener('click', () => deletePlace(place.id));
  });
}

// ===== LIST =====
function renderPlaceList() {
  placeList.innerHTML = '';

  if (!places.length) {
    placeList.innerHTML =
      '<div class="empty-state">Belum ada data kuliner tersimpan.</div>';
  } else {
    const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(place => {
      const item = document.createElement('div');
      item.className = 'place-item';
      item.dataset.placeId = place.id;

      const catClass = getCategoryClass(place.category);
      const menuText = place.menu ? place.menu : '';
      const priceText = place.price ? ` • ${place.price}` : '';

      item.innerHTML = `
        <div class="place-item-header">
          <div class="place-item-name">${place.name}</div>
        </div>
        <span class="place-item-category ${catClass}">${place.category}</span>
        <div class="place-item-extra">
          ${menuText}${priceText}
        </div>
      `;

      item.addEventListener('click', () => focusPlace(place.id));
      placeList.appendChild(item);
    });
  }

  totalPlacesEl.textContent = places.length;
}

function highlightPlaceInList(placeId) {
  document.querySelectorAll('.place-item').forEach(item => {
    item.style.borderColor = '#e5e7eb';
  });
  const item = document.querySelector(`.place-item[data-place-id="${placeId}"]`);
  if (item) {
    item.style.borderColor = '#2563eb';
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function focusPlace(id) {
  const place = places.find(p => p.id == id);
  const marker = markers[id];
  if (!place || !marker) return;
  map.setView([place.lat, place.lng], 17, { animate: true });
  marker.openPopup();
  highlightPlaceInList(id);
}

// ===== CRUD =====
placeForm.addEventListener('submit', async e => {
  e.preventDefault();

  const isEdit = isEditing && placeIdInput.value;

  const payload = {
    id: isEdit ? Number(placeIdInput.value) : undefined,
    name: nameInput.value.trim(),
    category: categoryInput.value,
    description: descInput.value.trim(),
    menu: menuInput.value.trim(),
    price: priceInput.value.trim(),
    address: addressInput.value.trim(),
    hours: hoursInput.value.trim(),
    photo: photoInput.value.trim(),
    lat: selectedLatLng ? selectedLatLng.lat : undefined,
    lng: selectedLatLng ? selectedLatLng.lng : undefined
  };

  if (!payload.name) {
    alert('Nama tempat wajib diisi.');
    return;
  }

  if (!isEdit && !selectedLatLng) {
    alert('Klik pada peta untuk memilih koordinat lokasi.');
    return;
  }

  try {
    if (isEdit) {
      await PlacesAPI.update(payload);
    } else {
      const res = await PlacesAPI.create(payload);
      places.push(res.place);
    }

    await reloadFromServer();
    resetFormState();
    alert('Data berhasil disimpan.');
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan saat menyimpan data.');
  }
});

async function deletePlace(id) {
  if (!confirm('Yakin ingin menghapus lokasi ini?')) return;
  try {
    await PlacesAPI.remove(id);
    await reloadFromServer();
    resetFormState();
  } catch (err) {
    console.error(err);
    alert('Gagal menghapus data.');
  }
}

function startEdit(id) {
  const place = places.find(p => p.id == id);
  if (!place) return;

  isEditing = true;
  placeIdInput.value = place.id;
  nameInput.value = place.name;
  categoryInput.value = place.category;
  descInput.value = place.description || '';
  menuInput.value = place.menu || '';
  priceInput.value = place.price || '';
  addressInput.value = place.address || '';
  hoursInput.value = place.hours || '';
  photoInput.value = place.photo || '';
  selectedLatLng = { lat: Number(place.lat), lng: Number(place.lng) };

  coordDisplay.textContent = `${place.lat.toFixed(5)}, ${place.lng.toFixed(
    5
  )} (sedang diedit)`;

  document.getElementById('submitBtn').textContent = 'Simpan Perubahan';

  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker(selectedLatLng, { opacity: 0.5 }).addTo(map);
  map.setView(selectedLatLng, 17);
}

function resetFormState() {
  isEditing = false;
  placeIdInput.value = '';
  placeForm.reset();
  categoryInput.value = 'Street Food';
  coordDisplay.textContent = 'Klik pada peta untuk memilih lokasi';
  document.getElementById('submitBtn').textContent = 'Simpan Lokasi';
  selectedLatLng = null;
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

// ===== RESET BUTTON =====
if (resetBtn) {
  resetBtn.addEventListener('click', resetFormState);
}

// ===== MAP CLICK =====
map.on('click', e => {
  selectedLatLng = e.latlng;
  coordDisplay.textContent = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(
    5
  )} (siap disimpan)`;
  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker(selectedLatLng, { opacity: 0.5 }).addTo(map);
});

// ===== RELOAD DARI SERVER =====
async function reloadFromServer() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  const data = await PlacesAPI.getAll();
  places = data.map(p => ({
    ...p,
    lat: Number(p.lat),
    lng: Number(p.lng)
  }));

  places.forEach(createOrUpdateMarker);
  renderPlaceList();

  if (places.length) {
    const group = L.featureGroup(Object.values(markers));
    map.fitBounds(group.getBounds(), { padding: [40, 40] });
  }
}

// ===== INIT =====
(async function init() {
  try {
    await reloadFromServer();
  } catch (err) {
    console.error(err);
    alert('Gagal memuat data dari server.');
  }
})();