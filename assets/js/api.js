// assets/js/api.js

const API_URL = '/semarasa/api/places.php'; 

export const PlacesAPI = {
  async getAll() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Gagal mengambil data kuliner');
    return res.json();
  },

  async create(data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', data })
    });
    if (!res.ok) throw new Error('Gagal menyimpan data');
    return res.json();
  },

  async update(data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', data })
    });
    if (!res.ok) throw new Error('Gagal mengubah data');
    return res.json();
  },

  async remove(id) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', data: { id } })
    });
    if (!res.ok) throw new Error('Gagal menghapus data');
    return res.json();
  }
};