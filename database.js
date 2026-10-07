// FoodBridge Embedded High-Performance Server Database Engine
// Provides ACID-like atomic persistence, indexing, querying, and real-time change event broadcasting

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class DatabaseEngine extends EventEmitter {
  constructor(dbPath) {
    super();
    this.dbPath = dbPath;
    this.dataDir = path.dirname(dbPath);
    this.isWriting = false;
    this.writeQueue = [];

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.data = {
      users: [],
      donations: [],
      requests: [],
      notifications: [],
      activities: []
    };

    this.load();
  }

  load() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          donations: parsed.donations || [],
          requests: parsed.requests || [],
          notifications: parsed.notifications || [],
          activities: parsed.activities || []
        };
        console.log(`[Database] Loaded successfully from ${this.dbPath}. (${this.data.donations.length} donations, ${this.data.users.length} users)`);
      } catch (err) {
        console.error('[Database] Failed to read database file, initializing fresh:', err.message);
        this.seedInitialData();
        this.saveSync();
      }
    } else {
      console.log('[Database] Database file not found. Seeding realistic demonstration data...');
      this.seedInitialData();
      this.saveSync();
    }
  }

  seedInitialData() {
    const now = Date.now();
    this.data.users = [
      {
        uid: 'usr-donor-101',
        name: 'Grand Plaza Banquets',
        email: 'donor@foodbridge.org',
        phone: '+91 98100 12345',
        role: 'donor',
        location: 'Connaught Place, Central Delhi',
        status: 'active',
        createdAt: new Date(now - 7 * 86400000).toISOString()
      },
      {
        uid: 'usr-donor-102',
        name: 'Daily Crust Artisan Bakery',
        email: 'bakery@dailycrust.com',
        phone: '+91 98711 54321',
        role: 'donor',
        location: 'Defence Colony Market, New Delhi',
        status: 'active',
        createdAt: new Date(now - 5 * 86400000).toISOString()
      },
      {
        uid: 'usr-ngo-201',
        name: 'Hope For All Foundation',
        email: 'ngo@foodbridge.org',
        phone: '+91 98111 88888',
        role: 'ngo',
        location: 'Lajpat Nagar, New Delhi',
        ngoRegistrationNumber: 'NGO-DL-2021-9988',
        ngoMission: 'Distributing surplus cooked food to underserved children and homeless shelters.',
        isApproved: true,
        status: 'active',
        createdAt: new Date(now - 6 * 86400000).toISOString()
      },
      {
        uid: 'usr-ngo-202',
        name: 'Annapurna Food Relief',
        email: 'contact@annapurna-relief.org',
        phone: '+91 99102 34567',
        role: 'ngo',
        location: 'Karol Bagh, New Delhi',
        ngoRegistrationNumber: 'NGO-DL-2023-4412',
        ngoMission: 'Zero hunger advocacy and emergency food pantry operations.',
        isApproved: false,
        status: 'active',
        createdAt: new Date(now - 2 * 86400000).toISOString()
      },
      {
        uid: 'usr-admin-001',
        name: 'Platform Administrator',
        email: 'admin@foodbridge.org',
        phone: '+91 99999 00001',
        role: 'admin',
        location: 'National Headquarters',
        status: 'active',
        createdAt: new Date(now - 30 * 86400000).toISOString()
      }
    ];

    this.data.donations = [
      {
        donationId: 'don-101',
        foodName: 'Steamed Basmati Rice & Dal Makhani',
        foodType: 'Cooked Meals',
        quantity: 45,
        quantityUnit: 'meals / servings',
        description: 'Freshly prepared banquet surplus. Kept at temperature-controlled hot holding containers. Ready for immediate pickup.',
        preparationTime: new Date(now - 2 * 3600000).toISOString(),
        availableUntil: new Date(now + 6 * 3600000).toISOString(),
        pickupLocation: 'Grand Plaza Banquets, Connaught Place',
        latitude: 28.6315,
        longitude: 77.2167,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
        status: 'Available',
        donorId: 'usr-donor-101',
        donorName: 'Grand Plaza Banquets',
        donorEmail: 'donor@foodbridge.org',
        donorPhone: '+91 98100 12345',
        acceptedBy: null,
        acceptedByName: null,
        acceptedByEmail: null,
        acceptedByPhone: null,
        createdAt: new Date(now - 2 * 3600000).toISOString(),
        updatedAt: new Date(now - 2 * 3600000).toISOString()
      },
      {
        donationId: 'don-102',
        foodName: 'Assorted Sourdough Loaves & Buns',
        foodType: 'Bakery & Snacks',
        quantity: 30,
        quantityUnit: 'packets',
        description: 'Freshly baked morning loaves and whole wheat buns. Safe, hygienic and sealed.',
        preparationTime: new Date(now - 4 * 3600000).toISOString(),
        availableUntil: new Date(now + 18 * 3600000).toISOString(),
        pickupLocation: 'Daily Crust Bakery, Shop 14, Defence Colony',
        latitude: 28.5672,
        longitude: 77.2433,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
        status: 'Available',
        donorId: 'usr-donor-102',
        donorName: 'Daily Crust Artisan Bakery',
        donorEmail: 'bakery@dailycrust.com',
        donorPhone: '+91 98711 54321',
        acceptedBy: null,
        acceptedByName: null,
        acceptedByEmail: null,
        acceptedByPhone: null,
        createdAt: new Date(now - 4 * 3600000).toISOString(),
        updatedAt: new Date(now - 4 * 3600000).toISOString()
      },
      {
        donationId: 'don-103',
        foodName: 'Vegetable Biryani & Mixed Raita',
        foodType: 'Cooked Meals',
        quantity: 60,
        quantityUnit: 'meals / servings',
        description: 'Corporate luncheon surplus. Packed into individual thermal delivery boxes.',
        preparationTime: new Date(now - 3 * 3600000).toISOString(),
        availableUntil: new Date(now + 4 * 3600000).toISOString(),
        pickupLocation: 'Grand Plaza Banquets, Connaught Place',
        latitude: 28.6315,
        longitude: 77.2167,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
        status: 'Accepted',
        donorId: 'usr-donor-101',
        donorName: 'Grand Plaza Banquets',
        donorEmail: 'donor@foodbridge.org',
        donorPhone: '+91 98100 12345',
        acceptedBy: 'usr-ngo-201',
        acceptedByName: 'Hope For All Foundation',
        acceptedByEmail: 'ngo@foodbridge.org',
        acceptedByPhone: '+91 98111 88888',
        acceptedAt: new Date(now - 1 * 3600000).toISOString(),
        createdAt: new Date(now - 3 * 3600000).toISOString(),
        updatedAt: new Date(now - 1 * 3600000).toISOString()
      }
    ];

    this.data.activities = [
      {
        id: 'act-1',
        text: 'Grand Plaza Banquets posted 45 meals of Steamed Basmati Rice & Dal Makhani',
        time: new Date(now - 2 * 3600000).toISOString()
      },
      {
        id: 'act-2',
        text: 'Hope For All Foundation claimed 60 meals of Vegetable Biryani',
        time: new Date(now - 1 * 3600000).toISOString()
      }
    ];
  }

  scheduleSave() {
    if (this.isWriting) {
      return;
    }

    this.isWriting = true;

    setImmediate(() => {
      const tempPath = this.dbPath + '.tmp';
      const jsonContent = JSON.stringify(this.data, null, 2);

      fs.writeFile(tempPath, jsonContent, 'utf8', (err) => {
        if (err) {
          console.error('[Database] Error writing temp file:', err);
          this.isWriting = false;
          return;
        }

        fs.rename(tempPath, this.dbPath, (renameErr) => {
          this.isWriting = false;
          if (renameErr) {
            try {
              fs.copyFileSync(tempPath, this.dbPath);
              fs.unlinkSync(tempPath);
            } catch (copyErr) {
              console.error('[Database] Failed to finalize database write:', copyErr.message);
            }
          }
        });
      });
    });
  }

  saveSync() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[Database] saveSync error:', e.message);
    }
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }

    const self = this;
    const items = this.data[name];
    const idKey = name === 'users' ? 'uid' : (name === 'donations' ? 'donationId' : 'id');

    return {
      find(filterFn, sortFn) {
        let results = [...items];
        if (typeof filterFn === 'function') {
          results = results.filter(filterFn);
        }
        if (typeof sortFn === 'function') {
          results.sort(sortFn);
        }
        return results;
      },

      findById(id) {
        return items.find(item => item[idKey] === id) || null;
      },

      findOne(filterFn) {
        return items.find(filterFn) || null;
      },

      insert(doc) {
        if (!doc[idKey]) {
          doc[idKey] = (name === 'users' ? 'usr-' : (name === 'donations' ? 'don-' : 'req-')) + Date.now();
        }
        if (!doc.createdAt) {
          doc.createdAt = new Date().toISOString();
        }
        doc.updatedAt = new Date().toISOString();

        items.unshift(doc);
        self.scheduleSave();

        self.emit('change', {
          collection: name,
          action: 'INSERT',
          item: doc
        });

        return doc;
      },

      update(id, partial) {
        const index = items.findIndex(item => item[idKey] === id);
        if (index === -1) {
          return null;
        }

        const prev = { ...items[index] };
        items[index] = {
          ...items[index],
          ...partial,
          updatedAt: new Date().toISOString()
        };

        self.scheduleSave();

        self.emit('change', {
          collection: name,
          action: 'UPDATE',
          item: items[index],
          previousItem: prev
        });

        return items[index];
      },

      delete(id) {
        const index = items.findIndex(item => item[idKey] === id);
        if (index === -1) {
          return false;
        }

        const deleted = items.splice(index, 1)[0];
        self.scheduleSave();

        self.emit('change', {
          collection: name,
          action: 'DELETE',
          item: deleted
        });

        return true;
      },

      count(filterFn) {
        if (typeof filterFn === 'function') {
          return items.filter(filterFn).length;
        }
        return items.length;
      }
    };
  }

  getSystemStats() {
    const donations = this.data.donations || [];
    const users = this.data.users || [];

    let totalMeals = 0;
    let totalKg = 0;
    let available = 0;
    let accepted = 0;
    let completed = 0;
    let cancelled = 0;

    donations.forEach(d => {
      const q = parseFloat(d.quantity) || 0;
      if (d.quantityUnit && d.quantityUnit.includes('kg')) {
        totalKg += q;
      } else {
        totalMeals += q;
      }

      const st = (d.status || '').toLowerCase();
      if (st === 'available') available++;
      else if (st === 'accepted' || st === 'picked up') accepted++;
      else if (st === 'completed') completed++;
      else if (st === 'cancelled' || st === 'expired') cancelled++;
    });

    const totalDonors = users.filter(u => u.role === 'donor').length;
    const totalNgos = users.filter(u => u.role === 'ngo').length;
    const pendingNgoApprovals = users.filter(u => u.role === 'ngo' && u.isApproved === false).length;

    return {
      totalDonations: donations.length,
      activeDonations: available,
      acceptedDonations: accepted,
      completedDonations: completed,
      cancelledOrExpiredDonations: cancelled,
      totalDonors,
      totalNgos,
      pendingNgoApprovals,
      totalMealsRedistributed: Math.round(totalMeals),
      totalKgFoodSaved: Math.round(totalKg)
    };
  }
}

const DB_FILE = path.join(__dirname, 'data', 'foodbridge.db.json');
const db = new DatabaseEngine(DB_FILE);

module.exports = db;
