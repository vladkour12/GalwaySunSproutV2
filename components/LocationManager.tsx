import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2 } from 'lucide-react';
import { Location } from '../types';

interface LocationManagerProps {
  locations: Location[];
  onAddLocation: (location: Location) => void;
  onDeleteLocation: (id: string) => void;
  onUpdateLocation: (location: Location) => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  locations,
  onAddLocation,
  onDeleteLocation,
  onUpdateLocation,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Location, 'id'>>({
    name: '',
    capacity: 10,
    description: '',
    temperature: undefined,
    humidity: undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Location name is required');
      return;
    }

    if (editingId) {
      onUpdateLocation({ ...formData, id: editingId } as Location);
      setEditingId(null);
    } else {
      const newLocation: Location = {
        ...formData,
        id: Date.now().toString(),
      };
      onAddLocation(newLocation);
    }

    setFormData({ name: '', capacity: 10, description: '' });
    setShowForm(false);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      capacity: location.capacity,
      description: location.description,
      temperature: location.temperature,
      humidity: location.humidity,
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', capacity: 10, description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-slate-900">Grow Locations</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Location</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">
            {editingId ? 'Edit Location' : 'New Location'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Shelf 1-A, Grow Room 1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Capacity (Trays)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  min="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.temperature || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Humidity (%)
                </label>
                <input
                  type="number"
                  value={formData.humidity || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      humidity: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  min="0"
                  max="100"
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., North side, receives morning sun"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Update' : 'Create'} Location
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-slate-50 rounded-lg">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600">No locations added yet</p>
          </div>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900">{location.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(location)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteLocation(location.id)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium">Capacity:</span> {location.capacity} trays
                </p>
                {location.temperature !== undefined && (
                  <p className="text-slate-600">
                    <span className="font-medium">Temperature:</span> {location.temperature}°C
                  </p>
                )}
                {location.humidity !== undefined && (
                  <p className="text-slate-600">
                    <span className="font-medium">Humidity:</span> {location.humidity}%
                  </p>
                )}
                {location.description && (
                  <p className="text-slate-600 italic">{location.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationManager;
